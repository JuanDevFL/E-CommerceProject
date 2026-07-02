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

function normalizeWompiTransactionStatus(value) {
  const status = String(value || '').trim().toUpperCase();

  if (status === 'APPROVED') {
    return 'approved';
  }

  if (['DECLINED', 'VOIDED', 'ERROR'].includes(status)) {
    return 'rejected';
  }

  return 'pending';
}

function resolveOrderState(paymentStatus) {
  if (paymentStatus === 'pending') return 'pendiente';
  if (paymentStatus === 'rejected') return 'cancelado';
  return 'pago_confirmado';
}

async function updateOrderByReference({ reference, paymentProvider, paymentMethod, paymentStatus }) {
  const [result] = await pool.query(
    `UPDATE ordenes
       SET payment_provider = ?, payment_method = ?, payment_status = ?, estado = ?
     WHERE referencia_pago = ?`,
    [
      paymentProvider,
      paymentMethod,
      paymentStatus,
      resolveOrderState(paymentStatus),
      reference,
    ]
  );

  return result.affectedRows > 0;
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
  const fallbackRedirectUrl = process.env.NODE_ENV === 'production' && requestOrigin
    ? `${requestOrigin.replace(/\/$/, '')}/checkout`
    : '';

  const configuredRedirectUrl = String(
    process.env.WOMPI_REDIRECT_URL || process.env.VITE_WOMPI_REDIRECT_URL || ''
  ).trim();

  const rawRedirectUrl = configuredRedirectUrl || fallbackRedirectUrl;
  const shouldSkipRedirectUrl = process.env.NODE_ENV === 'production'
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(rawRedirectUrl);

  return {
    publicKey: String(process.env.WOMPI_PUBLIC_KEY || process.env.VITE_WOMPI_PUBLIC_KEY || '').trim(),
    integritySecret: String(
      process.env.WOMPI_INTEGRITY_SECRET
      || process.env.WOMPI_SIGNATURE_INTEGRITY
      || process.env.VITE_WOMPI_SIGNATURE_INTEGRITY
      || ''
    ).trim(),
    currency: String(process.env.WOMPI_CURRENCY || process.env.VITE_WOMPI_CURRENCY || STORE_CURRENCY).trim().toUpperCase() || STORE_CURRENCY,
    // CloudFront can block localhost redirect URLs in widget mode (403).
    redirectUrl: shouldSkipRedirectUrl ? '' : rawRedirectUrl,
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

  // In local/staging environments force test keys to avoid accidental public charges.
  if (process.env.NODE_ENV !== 'production' && !settings.publicKey.startsWith('pub_test_')) {
    return res.status(400).json({
      error: 'En ambiente no productivo WOMPI_PUBLIC_KEY debe iniciar con pub_test_.',
    });
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
    isSandbox: settings.publicKey.startsWith('pub_test_'),
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
      'SELECT id, payment_provider, payment_status FROM ordenes WHERE referencia_pago = ? LIMIT 1',
      [reference]
    );

    if (existingReference.length > 0) {
      const existing = existingReference[0];
      const canUpdateSamePayment = String(existing.payment_provider || '').trim() === 'wompi'
        && paymentProvider === 'wompi';

      if (!canUpdateSamePayment) {
        return res.status(409).json({ error: 'La referencia del pedido ya existe. Recarga el checkout e intenta otra vez.' });
      }

      const updated = await updateOrderByReference({
        reference,
        paymentProvider,
        paymentMethod,
        paymentStatus,
      });

      if (!updated) {
        return res.status(409).json({ error: 'La referencia del pedido ya existe. Recarga el checkout e intenta otra vez.' });
      }

      return res.status(200).json({
        id: existing.id,
        referencia_pago: reference,
        payment_provider: paymentProvider,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        estado: resolveOrderState(paymentStatus),
        updated: true,
      });
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

function getWompiApiBase(publicKey) {
  return String(publicKey || '').startsWith('pub_test_')
    ? 'https://sandbox.wompi.co'
    : 'https://production.wompi.co';
}

function getWompiEventsSecret() {
  return String(
    process.env.WOMPI_EVENTS_SECRET
    || process.env.WOMPI_WEBHOOK_SECRET
    || process.env.WOMPI_INTEGRITY_SECRET
    || ''
  ).trim();
}

function getValueByPath(source, path) {
  if (!source || !path) return '';
  const normalized = String(path).trim();
  if (!normalized) return '';

  const parts = normalized.split('.').filter(Boolean);
  let cursor = source;

  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object' || !(part in cursor)) {
      return '';
    }
    cursor = cursor[part];
  }

  if (cursor == null) return '';
  if (typeof cursor === 'object') return JSON.stringify(cursor);
  return String(cursor);
}

function computeWompiEventChecksum(payload, secret) {
  const signature = payload?.signature || {};
  const properties = Array.isArray(signature.properties) ? signature.properties : [];
  const data = payload?.data || {};
  const timestamp = String(payload?.timestamp ?? '').trim();

  let concat = '';
  for (const propertyPath of properties) {
    const directPathValue = getValueByPath(data, propertyPath);
    const fallbackPathValue = directPathValue || getValueByPath(payload, propertyPath);
    concat += fallbackPathValue;
  }

  concat += timestamp;
  concat += secret;

  return createHash('sha256').update(concat).digest('hex');
}

function normalizePaymentMethodFromWompi(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return 'wompi_webhook';
  if (raw === 'BANCOLOMBIA_TRANSFER') return 'bancolombia_transfer';
  if (raw === 'BANCOLOMBIA_QR') return 'bancolombia_qr';
  return raw.toLowerCase();
}

export async function handleWompiWebhook(req, res) {
  const payload = req.body || {};
  const event = String(payload?.event || '').trim();

  // Acknowledge unknown events to avoid unnecessary retries.
  if (event !== 'transaction.updated') {
    return res.status(200).json({ ok: true, ignored: true, reason: 'unsupported_event' });
  }

  const secret = getWompiEventsSecret();
  if (!secret) {
    return res.status(503).json({ error: 'Configura WOMPI_EVENTS_SECRET para validar webhooks.' });
  }

  const checksumFromBody = String(payload?.signature?.checksum || '').trim();
  const checksumFromHeader = String(req.headers['x-event-checksum'] || '').trim();
  const receivedChecksum = (checksumFromBody || checksumFromHeader).toLowerCase();
  const computedChecksum = computeWompiEventChecksum(payload, secret).toLowerCase();

  if (!receivedChecksum || receivedChecksum !== computedChecksum) {
    return res.status(401).json({ error: 'Firma de evento inválida.' });
  }

  const tx = payload?.data?.transaction || {};
  const reference = String(tx?.reference || '').trim();
  const status = normalizeWompiTransactionStatus(tx?.status);

  if (!reference) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'missing_reference' });
  }

  if (status === 'pending') {
    return res.status(200).json({ ok: true, ignored: true, reason: 'non_final_status' });
  }

  const paymentMethod = normalizePaymentMethodFromWompi(tx?.payment_method_type);
  const updated = await updateOrderByReference({
    reference,
    paymentProvider: 'wompi',
    paymentMethod,
    paymentStatus: status,
  });

  if (!updated) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'order_not_found', reference });
  }

  await logActividad({
    accion: 'wompi_webhook_transaction_updated',
    descripcion: `Webhook Wompi actualizó ${reference} a ${status}`,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'] || null,
  });

  return res.status(200).json({ ok: true, updated: true, reference, paymentStatus: status });
}

export async function getWompiTransactionById(req, res) {
  const transactionId = String(req.params.transactionId || '').trim();
  const settings = getWompiCheckoutSettings(req);

  if (!transactionId) {
    return res.status(400).json({ error: 'El identificador de la transacción es obligatorio.' });
  }

  if (!settings.publicKey) {
    return res.status(503).json({ error: 'Configura WOMPI_PUBLIC_KEY en el backend para validar transacciones.' });
  }

  try {
    const apiBase = getWompiApiBase(settings.publicKey);
    const response = await fetch(`${apiBase}/v1/transactions/${encodeURIComponent(transactionId)}`);

    if (response.status === 404) {
      return res.status(404).json({ error: 'No se encontró la transacción en Wompi.' });
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
      return res.status(502).json({ error: 'No fue posible validar la transacción con Wompi.' });
    }

    const tx = payload.data;

    return res.json({
      id: String(tx.id || transactionId),
      reference: String(tx.reference || '').trim(),
      currency: String(tx.currency || settings.currency || STORE_CURRENCY).trim().toUpperCase() || STORE_CURRENCY,
      amountInCents: Number(tx.amount_in_cents || 0),
      status: normalizeWompiTransactionStatus(tx.status),
      rawStatus: String(tx.status || '').trim(),
      finalizedAt: tx.finalized_at || null,
    });
  } catch {
    return res.status(502).json({ error: 'No fue posible conectar con Wompi para validar el pago.' });
  }
}