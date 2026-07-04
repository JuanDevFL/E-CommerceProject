import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { sendOrderConfirmationEmail } from '../email.js';
import { validatePasswordPolicy } from '../passwordPolicy.js';
import { calculateShipping, STORE_CURRENCY, normalizePrice } from '../pricing.js';
import { logActividad } from '../userSchema.js';

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
}

function normalizePaymentStatus(value) {
  const status = String(value || 'approved').trim().toLowerCase();
  return ['approved', 'pending', 'rejected'].includes(status) ? status : 'approved';
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

function buildAddressSnapshot(address) {
  return {
    id: address.id,
    alias: address.alias,
    nombre_receptor: address.nombre_receptor,
    telefono: address.telefono,
    calle: address.calle,
    ciudad: address.ciudad,
    estado: address.estado,
    codigo_postal: address.codigo_postal,
    pais: address.pais,
  };
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

// ─── Perfil ──────────────────────────────────────────────────────────────────

export async function getMyProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, creado_at FROM usuarios WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const nombre = req.body.nombre?.trim();
    const email = req.body.email?.trim().toLowerCase();

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está en uso por otra cuenta' });
    }

    await pool.query('UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?', [nombre, email, req.user.id]);

    await logActividad({
      usuarioId: req.user.id,
      accion: 'actualizar_perfil',
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({ ok: true, nombre, email });
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

export async function changePassword(req, res) {
  try {
    const current = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!current || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
    }

    const passwordValidationError = validatePasswordPolicy(newPassword);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
    }

    const [rows] = await pool.query('SELECT password FROM usuarios WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, req.user.id]);

    await logActividad({
      usuarioId: req.user.id,
      accion: 'cambio_password',
      descripcion: 'Cambio de contraseña desde el portal de cuenta',
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export async function getMyOrders(req, res) {
  try {
    const [orders] = await pool.query(
      `SELECT id, subtotal, envio, total, moneda, estado, referencia_pago,
              payment_provider, payment_method, payment_status, direccion_envio_json, creado_at
       FROM ordenes
       WHERE usuario_id = ?
       ORDER BY creado_at DESC`,
      [req.user.id]
    );

    if (!orders.length) return res.json([]);

    const orderIds = orders.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    const [items] = await pool.query(
      `SELECT oi.orden_id, oi.cantidad, oi.precio,
              p.id AS producto_id, p.nombre, p.imagen_url, p.tono
       FROM orden_items oi
       JOIN productos p ON p.id = oi.producto_id
       WHERE oi.orden_id IN (${placeholders})`,
      orderIds
    );

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.orden_id]) itemsByOrder[item.orden_id] = [];
      itemsByOrder[item.orden_id].push(item);
    }

    res.json(orders.map((order) => ({
      ...order,
      direccion_envio: order.direccion_envio_json ? JSON.parse(order.direccion_envio_json) : null,
      items: itemsByOrder[order.id] || [],
    })));
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

export async function createMyOrder(req, res) {
  const items = sanitizeOrderItems(req.body.items);
  const addressId = Number(req.body.addressId);
  const reference = String(req.body.reference || '').trim().slice(0, 80);
  const paymentProvider = String(req.body.paymentProvider || 'mock_local').trim().slice(0, 40) || 'mock_local';
  const paymentMethod = String(req.body.paymentMethod || 'sandbox_local').trim().slice(0, 40) || 'sandbox_local';
  const paymentStatus = normalizePaymentStatus(req.body.paymentStatus);

  if (!items.length) {
    return res.status(400).json({ error: 'El pedido debe incluir al menos un producto válido.' });
  }

  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ error: 'Debes seleccionar una dirección de envío válida.' });
  }

  if (!reference) {
    return res.status(400).json({ error: 'La referencia del pago es obligatoria.' });
  }

  let connection;

  try {
    const [addressRows] = await pool.query(
      'SELECT * FROM direcciones_envio WHERE id = ? AND usuario_id = ? LIMIT 1',
      [addressId, req.user.id]
    );

    if (!addressRows.length) {
      return res.status(404).json({ error: 'La dirección seleccionada no existe.' });
    }

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

      if (paymentStatus === 'approved') {
        Promise.all([
          pool.query('SELECT total, moneda, direccion_envio_json FROM ordenes WHERE id = ? LIMIT 1', [existing.id]),
          pool.query(
            `SELECT oi.cantidad AS quantity, oi.precio AS unitPrice, p.nombre
             FROM orden_items oi
             JOIN productos p ON p.id = oi.producto_id
             WHERE oi.orden_id = ?`,
            [existing.id]
          ),
        ]).then(([[orderRows], [itemRows]]) => {
          if (!orderRows.length) return;
          const ord = orderRows[0];
          let addr = {};
          try { addr = JSON.parse(ord.direccion_envio_json || '{}'); } catch { /* */ }
          return sendOrderConfirmationEmail({
            to: req.user.email,
            customerName: req.user.nombre,
            order: {
              referencia_pago: reference,
              total: ord.total,
              moneda: ord.moneda || STORE_CURRENCY,
              estado: 'pago_confirmado',
              direccion_envio: addr,
              items: itemRows,
            },
          });
        }).catch((err) => {
          console.error('No se pudo enviar correo de confirmación (usuario, actualización):', err.message);
        });
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
    const addressSnapshot = buildAddressSnapshot(addressRows[0]);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO ordenes
         (usuario_id, cliente_tipo, cliente_nombre, cliente_email, cliente_telefono, subtotal, envio, total, moneda, estado, referencia_pago, payment_provider, payment_method, payment_status, direccion_envio_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'registered',
        req.user.nombre || null,
        req.user.email || null,
        addressSnapshot.telefono || null,
        subtotal.toFixed(2),
        shipping.toFixed(2),
        total.toFixed(2),
        STORE_CURRENCY,
        orderState,
        reference,
        paymentProvider,
        paymentMethod,
        paymentStatus,
        JSON.stringify(addressSnapshot),
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
      usuarioId: req.user.id,
      accion: 'crear_orden_prueba',
      descripcion: `Pedido ${reference} registrado con estado ${paymentStatus}`,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });

    await sendOrderConfirmationEmail({
      to: req.user.email,
      customerName: req.user.nombre,
      order: {
        referencia_pago: reference,
        total,
        moneda: STORE_CURRENCY,
        estado: orderState,
        direccion_envio: addressSnapshot,
        items: orderItems,
      },
    }).catch((error) => {
      console.error('No se pudo enviar el correo de confirmación del pedido registrado:', error.message);
    });

    res.status(201).json({
      id: result.insertId,
      subtotal,
      envio: shipping,
      total,
      moneda: STORE_CURRENCY,
      estado: orderState,
      referencia_pago: reference,
      payment_provider: paymentProvider,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      direccion_envio: addressSnapshot,
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

// ─── Direcciones de envío ────────────────────────────────────────────────────

export async function getMyAddresses(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM direcciones_envio WHERE usuario_id = ? ORDER BY es_principal DESC, id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
}

export async function createAddress(req, res) {
  try {
    const { alias, nombre_receptor, telefono, calle, ciudad, estado, codigo_postal, pais, es_principal } = req.body;

    if (!nombre_receptor?.trim() || !calle?.trim() || !ciudad?.trim() || !estado?.trim() || !codigo_postal?.trim()) {
      return res.status(400).json({ error: 'Nombre, calle, ciudad, estado y código postal son obligatorios' });
    }

    if (es_principal) {
      await pool.query('UPDATE direcciones_envio SET es_principal = FALSE WHERE usuario_id = ?', [req.user.id]);
    }

    const [result] = await pool.query(
      `INSERT INTO direcciones_envio
         (usuario_id, alias, nombre_receptor, telefono, calle, ciudad, estado, codigo_postal, pais, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        alias?.trim() || 'Casa',
        nombre_receptor.trim(),
        telefono?.trim() || null,
        calle.trim(),
        ciudad.trim(),
        estado.trim(),
        codigo_postal.trim(),
        pais?.trim() || 'México',
        Boolean(es_principal),
      ]
    );

    const [rows] = await pool.query('SELECT * FROM direcciones_envio WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear dirección' });
  }
}

export async function updateAddress(req, res) {
  try {
    const addressId = Number(req.params.addressId);
    const { alias, nombre_receptor, telefono, calle, ciudad, estado, codigo_postal, pais, es_principal } = req.body;

    if (!nombre_receptor?.trim() || !calle?.trim() || !ciudad?.trim() || !estado?.trim() || !codigo_postal?.trim()) {
      return res.status(400).json({ error: 'Nombre, calle, ciudad, estado y código postal son obligatorios' });
    }

    const [check] = await pool.query(
      'SELECT id FROM direcciones_envio WHERE id = ? AND usuario_id = ?',
      [addressId, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Dirección no encontrada' });

    if (es_principal) {
      await pool.query('UPDATE direcciones_envio SET es_principal = FALSE WHERE usuario_id = ?', [req.user.id]);
    }

    await pool.query(
      `UPDATE direcciones_envio
       SET alias=?, nombre_receptor=?, telefono=?, calle=?, ciudad=?, estado=?, codigo_postal=?, pais=?, es_principal=?
       WHERE id=?`,
      [
        alias?.trim() || 'Casa',
        nombre_receptor.trim(),
        telefono?.trim() || null,
        calle.trim(),
        ciudad.trim(),
        estado.trim(),
        codigo_postal.trim(),
        pais?.trim() || 'México',
        Boolean(es_principal),
        addressId,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM direcciones_envio WHERE id = ?', [addressId]);
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar dirección' });
  }
}

export async function deleteAddress(req, res) {
  try {
    const addressId = Number(req.params.addressId);

    const [check] = await pool.query(
      'SELECT id FROM direcciones_envio WHERE id = ? AND usuario_id = ?',
      [addressId, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Dirección no encontrada' });

    await pool.query('DELETE FROM direcciones_envio WHERE id = ?', [addressId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar dirección' });
  }
}
