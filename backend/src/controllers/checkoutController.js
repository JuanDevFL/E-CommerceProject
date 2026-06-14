import { createHash } from 'node:crypto';
import pool from '../db.js';
import { sendOrderConfirmationEmail } from '../email.js';
import { calculateShipping, STORE_CURRENCY, normalizePrice } from '../pricing.js';
import { logActividad } from '../userSchema.js';

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
}

function normalizePaymentStatus(value) {
  const status = String(value || 'pending').trim().toLowerCase();
  return ['approved', 'pending', 'rejected'].includes(status) ? status : 'pending';
}

function resolveOrderState(paymentStatus) {
  if (paymentStatus === 'pending') return 'pendiente';
  if (paymentStatus === 'rejected') return 'cancelado';
  return 'confirmado';
}

function sanitizeOrderItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const grouped = new Map();

  for (const rawItem of rawItems) {
    const productId = Number(rawItem?.productId);
    const quantity = Number(rawItem?.quantity);

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }

    grouped.set(productId, (grouped.get(productId) || 0) + quantity);
  }

  return [...grouped.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function normalizeGuestCustomer(rawCustomer) {
  return {
    nombre: String(rawCustomer?.nombre || '').trim(),
    email: String(rawCustomer?.email || '').trim().toLowerCase(),
    telefono: String(rawCustomer?.telefono || '').trim(),
  };
}

function normalizeGuestAddress(rawAddress) {
  return {
    alias: String(rawAddress?.alias || 'Entrega').trim() || 'Entrega',
    nombre_receptor: String(rawAddress?.nombre_receptor || '').trim(),
    telefono: String(rawAddress?.telefono || '').trim(),
    calle: String(rawAddress?.calle || '').trim(),
    ciudad: String(rawAddress?.ciudad || '').trim(),
    estado: String(rawAddress?.estado || '').trim(),
    codigo_postal: String(rawAddress?.codigo_postal || '').trim(),
    pais: String(rawAddress?.pais || 'Colombia').trim() || 'Colombia',
  };
}

function getWompiCheckoutSettings(req) {
  const requestOrigin = String(req.headers.origin || '').trim();
  const fallbackRedirectUrl = requestOrigin ? `${requestOrigin.replace(/\/$/, '')}/checkout` : '';

  return {
    publicKey: String(process.env.WOMPI_PUBLIC_KEY || process.env.VITE_WOMPI_PUBLIC_KEY || '').trim(),
    integritySecret: String(
      process.env.WOMPI_INTEGRITY_SECRET
      || process.env.WOMPI_SIGNATURE_INTEGRITY
      || process.env.VITE_WOMPI_SIGNATURE_INTEGRITY
      || ''
    ).trim(),
    currency: String(process.env.WOMPI_CURRENCY || process.env.VITE_WOMPI_CURRENCY || STORE_CURRENCY).trim().toUpperCase() || STORE_CURRENCY,
    redirectUrl: String(process.env.WOMPI_REDIRECT_URL || process.env.VITE_WOMPI_REDIRECT_URL || fallbackRedirectUrl).trim(),
  };
}

export function createWompiWidgetConfig(req, res) {
  const reference = String(req.body.reference || '').trim().slice(0, 80);
  const requestedCurrency = String(req.body.currency || '').trim().toUpperCase();
  const amountInCents = Number(req.body.amountInCents);
  const settings = getWompiCheckoutSettings(req);
  const currency = requestedCurrency || settings.currency || STORE_CURRENCY;

  if (!reference) {
    return res.status(400).json({ error: 'La referencia de Wompi es obligatoria.' });
  }

  if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
    return res.status(400).json({ error: 'El monto para Wompi debe enviarse en centavos y ser mayor a cero.' });
  }

  if (!settings.publicKey) {
    return res.status(503).json({ error: 'Configura WOMPI_PUBLIC_KEY en el backend para activar el widget de Wompi.' });
  }

  if (!settings.integritySecret) {
    return res.status(503).json({ error: 'Configura WOMPI_INTEGRITY_SECRET en el backend. La firma de integridad no debe vivir en el frontend.' });
  }

  const signatureIntegrity = createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${settings.integritySecret}`)
    .digest('hex');

  return res.json({
    amountInCents,
    currency,
    publicKey: settings.publicKey,
    reference,
    redirectUrl: settings.redirectUrl,
    signatureIntegrity,
  });
}

export async function createGuestOrder(req, res) {
  const items = sanitizeOrderItems(req.body.items);
  const customer = normalizeGuestCustomer(req.body.customer);
  const address = normalizeGuestAddress(req.body.address);
  const reference = String(req.body.reference || '').trim().slice(0, 80);
  const paymentProvider = String(req.body.paymentProvider || 'mock_local').trim().slice(0, 40) || 'mock_local';
  const paymentMethod = String(req.body.paymentMethod || 'sandbox_local').trim().slice(0, 40) || 'sandbox_local';
  const paymentStatus = normalizePaymentStatus(req.body.paymentStatus);

  if (!items.length) {
    return res.status(400).json({ error: 'El pedido debe incluir al menos un producto válido.' });
  }

  if (!customer.nombre || !customer.email || !customer.telefono) {
    return res.status(400).json({ error: 'Nombre, correo y teléfono son obligatorios para comprar sin cuenta.' });
  }

  if (!address.nombre_receptor || !address.calle || !address.ciudad || !address.estado || !address.codigo_postal) {
    return res.status(400).json({ error: 'Completa la información de envío para continuar.' });
  }

  if (!reference) {
    return res.status(400).json({ error: 'La referencia del pago es obligatoria.' });
  }

  let connection;

  try {
    const [existingReference] = await pool.query(
      'SELECT id FROM ordenes WHERE referencia_pago = ? LIMIT 1',
      [reference]
    );

    if (existingReference.length > 0) {
      return res.status(409).json({ error: 'La referencia del pedido ya existe. Recarga el checkout e intenta otra vez.' });
    }

    const productIds = items.map((item) => item.productId);
    const placeholders = productIds.map(() => '?').join(',');
    const [productRows] = await pool.query(
      `SELECT id, nombre, precio, stock FROM productos WHERE id IN (${placeholders})`,
      productIds
    );

    if (productRows.length !== productIds.length) {
      return res.status(400).json({ error: 'Uno o más productos del carrito ya no existen en la base de datos.' });
    }

    const productsById = new Map(productRows.map((row) => [row.id, row]));
    const orderItems = [];

    for (const item of items) {
      const product = productsById.get(item.productId);

      if (!product) {
        return res.status(400).json({ error: 'No se pudo validar uno de los productos del pedido.' });
      }

      if (Number(product.stock || 0) < item.quantity) {
        return res.status(400).json({ error: `No hay stock suficiente para ${product.nombre}.` });
      }

      orderItems.push({
        productId: product.id,
        nombre: product.nombre,
        quantity: item.quantity,
        unitPrice: normalizePrice(product.precio),
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;
    const orderState = resolveOrderState(paymentStatus);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO ordenes
         (usuario_id, cliente_tipo, cliente_nombre, cliente_email, cliente_telefono, subtotal, envio, total, moneda, estado, referencia_pago, payment_provider, payment_method, payment_status, direccion_envio_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        null,
        'guest',
        customer.nombre,
        customer.email,
        customer.telefono,
        subtotal.toFixed(2),
        shipping.toFixed(2),
        total.toFixed(2),
        STORE_CURRENCY,
        orderState,
        reference,
        paymentProvider,
        paymentMethod,
        paymentStatus,
        JSON.stringify(address),
      ]
    );

    for (const item of orderItems) {
      await connection.query(
        'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
        [result.insertId, item.productId, item.quantity, item.unitPrice.toFixed(2)]
      );
    }

    await connection.commit();

    await logActividad({
      accion: 'crear_orden_invitado',
      descripcion: `Pedido invitado ${reference} registrado para ${customer.email}`,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });

    await sendOrderConfirmationEmail({
      to: customer.email,
      customerName: customer.nombre,
      order: {
        referencia_pago: reference,
        total,
        moneda: STORE_CURRENCY,
        estado: orderState,
        direccion_envio: address,
        items: orderItems,
      },
    }).catch((error) => {
      console.error('No se pudo enviar el correo de confirmación del pedido invitado:', error.message);
    });

    res.status(201).json({
      id: result.insertId,
      cliente_tipo: 'guest',
      cliente_nombre: customer.nombre,
      cliente_email: customer.email,
      cliente_telefono: customer.telefono,
      subtotal,
      envio: shipping,
      total,
      moneda: STORE_CURRENCY,
      estado: orderState,
      referencia_pago: reference,
      payment_provider: paymentProvider,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      direccion_envio: address,
      items: orderItems,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ error: error.message || 'Error al crear el pedido.' });
  } finally {
    connection?.release();
  }
}