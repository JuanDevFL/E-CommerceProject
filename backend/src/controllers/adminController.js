import pool from '../db.js';
import { normalizeUserRole } from '../userSchema.js';

function toNumber(value) {
  return Number(value || 0);
}

function parseAddress(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const ALLOWED_ORDER_STATES = ['pendiente', 'pago_confirmado', 'enviado', 'entregado', 'cancelado'];

function normalizeOrderState(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'confirmado' || normalized === 'pagado' || normalized === 'pago confirmado') {
    return 'pago_confirmado';
  }

  return normalized;
}

function normalizeDashboardUser(user) {
  return {
    ...user,
    rol: normalizeUserRole(user.rol),
  };
}

function normalizeAnnouncementStatus(value) {
  return String(value || '').trim().toLowerCase() === 'inactivo' ? 'inactivo' : 'activo';
}

function normalizeAnnouncementUrl(value) {
  return String(value || '').trim();
}

export async function getAdminDashboard(req, res, next) {
  try {
    const [salesResult, inventoryResult, userStatsResult, featuredResult, recentOrdersResult, categoriesResult, usersResult, productsResult, announcementsResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS totalOrders,
          COALESCE(SUM(total), 0) AS totalRevenue,
          COALESCE(AVG(total), 0) AS averageTicket
        FROM ordenes
      `),
      pool.query(`
        SELECT
          COUNT(*) AS totalProducts,
          COALESCE(SUM(stock), 0) AS totalStock,
          SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS lowStockProducts
        FROM productos
      `),
      pool.query(`
        SELECT
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN rol = 'admin' THEN 1 ELSE 0 END) AS totalAdmins
        FROM usuarios
      `),
      pool.query(`
        SELECT
          p.id,
          p.nombre,
          p.precio,
          p.stock,
          p.categoria,
          p.tono,
          p.material,
          p.etiqueta,
          p.imagen_url,
          COALESCE(SUM(CASE
            WHEN o.payment_status = 'approved' OR o.estado IN ('pago_confirmado', 'confirmado', 'pagado', 'entregado')
            THEN oi.cantidad
            ELSE 0
          END), 0) AS total_vendidas
        FROM productos p
        LEFT JOIN orden_items oi ON oi.producto_id = p.id
        LEFT JOIN ordenes o ON o.id = oi.orden_id
        GROUP BY p.id, p.nombre, p.precio, p.stock, p.categoria, p.tono, p.material, p.etiqueta, p.imagen_url
        ORDER BY total_vendidas DESC, p.stock DESC, p.precio DESC, p.id DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT
          o.id,
          o.total,
          o.estado,
          o.creado_at,
          COALESCE(u.nombre, o.cliente_nombre, 'Cliente sin registro') AS cliente,
          COALESCE(u.email, o.cliente_email) AS cliente_email,
          o.cliente_tipo,
          o.cliente_telefono,
          COALESCE(oi.total_productos, 0) AS total_productos,
          o.payment_status,
          o.referencia_pago,
          o.direccion_envio_json
        FROM ordenes o
        LEFT JOIN usuarios u ON u.id = o.usuario_id
        LEFT JOIN (
          SELECT orden_id, SUM(cantidad) AS total_productos
          FROM orden_items
          GROUP BY orden_id
        ) oi ON oi.orden_id = o.id
        ORDER BY o.creado_at DESC
      `),
      pool.query(`
        SELECT
          categoria,
          COUNT(*) AS totalProductos,
          COALESCE(SUM(stock), 0) AS stockTotal
        FROM productos
        GROUP BY categoria
        ORDER BY stockTotal DESC, totalProductos DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, nombre, email, rol, creado_at
        FROM usuarios
        ORDER BY creado_at DESC
      `),
      pool.query(`
        SELECT id, nombre, precio, stock, categoria, tono, etiqueta, creado_at
        FROM productos
        ORDER BY creado_at DESC
      `),
      pool.query(`
        SELECT id, imagen_url, estado, creado_at, actualizado_at
        FROM anuncios
        ORDER BY id ASC
      `),
    ]);

    const [salesRows] = salesResult;
    const [inventoryRows] = inventoryResult;
    const [userStatsRows] = userStatsResult;
    const [featuredRows] = featuredResult;
    const [recentOrders] = recentOrdersResult;
    const [categories] = categoriesResult;
    const [users] = usersResult;
    const [products] = productsResult;
    const [announcements] = announcementsResult;

    const salesSummary = salesRows[0] || {};
    const inventorySummary = inventoryRows[0] || {};
    const userSummary = userStatsRows[0] || {};
    const featuredProduct = featuredRows[0] || null;

    const metrics = {
      totalRevenue: toNumber(salesSummary.totalRevenue),
      totalOrders: toNumber(salesSummary.totalOrders),
      averageTicket: toNumber(salesSummary.averageTicket),
      totalProducts: toNumber(inventorySummary.totalProducts),
      totalStock: toNumber(inventorySummary.totalStock),
      lowStockProducts: toNumber(inventorySummary.lowStockProducts),
      totalUsers: toNumber(userSummary.totalUsers),
      totalAdmins: toNumber(userSummary.totalAdmins),
    };

    const alerts = [];

    if (metrics.totalOrders === 0) {
      alerts.push({
        id: 'orders',
        title: 'Sin ventas registradas',
        detail: 'Aún no hay órdenes en la base. El panel ya está listo para empezar a medir conversión y ticket promedio.',
      });
    }

    if (metrics.lowStockProducts > 0) {
      alerts.push({
        id: 'stock',
        title: 'Inventario por revisar',
        detail: `${metrics.lowStockProducts} producto(s) tienen stock igual o menor a 5 unidades.`,
      });
    }

    res.json({
      generatedAt: new Date().toISOString(),
      currentAdmin: req.user,
      metrics,
      featuredProduct,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        direccion_envio: parseAddress(order.direccion_envio_json),
      })),
      categoryBreakdown: categories,
      users: users.map(normalizeDashboardUser),
      products,
      announcements,
      alerts,
    });
  } catch (error) {
    next(error);
  }
}

export async function getActiveAnnouncements(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, imagen_url
       FROM anuncios
       WHERE estado = 'activo'
       ORDER BY id ASC
       LIMIT 5`
    );

    res.json({ announcements: rows });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const imagenUrl = normalizeAnnouncementUrl(req.body.imagen_url);
    const estado = normalizeAnnouncementStatus(req.body.estado);

    if (!imagenUrl) {
      return res.status(400).json({ error: 'La URL de la imagen es obligatoria' });
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM anuncios');
    const total = Number(countRows[0]?.total || 0);

    if (total >= 5) {
      return res.status(400).json({ error: 'Solo puedes registrar hasta 5 anuncios' });
    }

    const [result] = await pool.query(
      'INSERT INTO anuncios (imagen_url, estado) VALUES (?, ?)',
      [imagenUrl, estado]
    );

    const [rows] = await pool.query(
      'SELECT id, imagen_url, estado, creado_at, actualizado_at FROM anuncios WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const announcementId = Number(req.params.announcementId);

    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      return res.status(400).json({ error: 'El identificador del anuncio no es válido' });
    }

    const imagenUrl = normalizeAnnouncementUrl(req.body.imagen_url);
    const estado = normalizeAnnouncementStatus(req.body.estado);

    if (!imagenUrl) {
      return res.status(400).json({ error: 'La URL de la imagen es obligatoria' });
    }

    const [existingRows] = await pool.query('SELECT id FROM anuncios WHERE id = ? LIMIT 1', [announcementId]);

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    await pool.query(
      'UPDATE anuncios SET imagen_url = ?, estado = ? WHERE id = ?',
      [imagenUrl, estado, announcementId]
    );

    const [rows] = await pool.query(
      'SELECT id, imagen_url, estado, creado_at, actualizado_at FROM anuncios WHERE id = ? LIMIT 1',
      [announcementId]
    );

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function updateUsuarioRol(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const requestedRole = req.body.rol;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'El identificador del usuario no es válido' });
    }

    if (requestedRole !== 'user' && requestedRole !== 'admin') {
      return res.status(400).json({ error: 'El rol solicitado no es válido' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes modificar tu propio rol desde este panel' });
    }

    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, creado_at FROM usuarios WHERE id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No encontramos el usuario solicitado' });
    }

    const [targetUser] = rows;

    if (targetUser.rol === 'admin' && requestedRole === 'user') {
      const [adminCountRows] = await pool.query(
        "SELECT COUNT(*) AS totalAdmins FROM usuarios WHERE rol = 'admin'"
      );

      if (toNumber(adminCountRows[0]?.totalAdmins) <= 1) {
        return res.status(400).json({ error: 'Debe existir al menos un administrador activo' });
      }
    }

    await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', [requestedRole, userId]);

    res.json({
      id: targetUser.id,
      nombre: targetUser.nombre,
      email: targetUser.email,
      rol: requestedRole,
      creado_at: targetUser.creado_at,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'El identificador de la orden no es válido' });
    }

    const [orderRows] = await pool.query(
      `SELECT o.id, o.subtotal, o.envio, o.total, o.estado, o.creado_at,
              o.payment_status, o.referencia_pago, o.cliente_tipo, o.cliente_telefono, o.direccion_envio_json,
              COALESCE(u.nombre, o.cliente_nombre, 'Cliente sin registro') AS cliente,
              COALESCE(u.email, o.cliente_email) AS cliente_email
       FROM ordenes o
       LEFT JOIN usuarios u ON u.id = o.usuario_id
       WHERE o.id = ? LIMIT 1`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const [items] = await pool.query(
      `SELECT oi.id, oi.cantidad, oi.precio,
              p.nombre, p.imagen_url, p.categoria
       FROM orden_items oi
       LEFT JOIN productos p ON p.id = oi.producto_id
       WHERE oi.orden_id = ?`,
      [orderId]
    );

    res.json({
      ...orderRows[0],
      direccion_envio: orderRows[0].direccion_envio_json ? JSON.parse(orderRows[0].direccion_envio_json) : null,
      items,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const requestedState = normalizeOrderState(req.body.estado);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'El identificador de la orden no es válido' });
    }

    if (!ALLOWED_ORDER_STATES.includes(requestedState)) {
      return res.status(400).json({ error: 'El estado solicitado no es válido' });
    }

    const [rows] = await pool.query('SELECT id FROM ordenes WHERE id = ? LIMIT 1', [orderId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    await pool.query('UPDATE ordenes SET estado = ? WHERE id = ?', [requestedState, orderId]);

    res.json({ id: orderId, estado: requestedState });
  } catch (error) {
    next(error);
  }
}
