import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { logActividad } from '../userSchema.js';

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
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
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const [rows] = await pool.query('SELECT password FROM usuarios WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
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
      'SELECT id, total, estado, creado_at FROM ordenes WHERE usuario_id = ? ORDER BY creado_at DESC',
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

    res.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] })));
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
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
