import pool from '../db.js';
import { normalizeUserRole } from '../userSchema.js';

function toNumber(value) {
  return Number(value || 0);
}

function normalizeDashboardUser(user) {
  return {
    ...user,
    rol: normalizeUserRole(user.rol),
  };
}

export async function getAdminDashboard(req, res, next) {
  try {
    const [salesResult, inventoryResult, userStatsResult, featuredResult, recentOrdersResult, categoriesResult, usersResult, productsResult] = await Promise.all([
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
        SELECT id, nombre, precio, stock, categoria, tono, material, etiqueta, imagen_url
        FROM productos
        ORDER BY stock DESC, precio DESC, id DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT
          o.id,
          o.total,
          o.estado,
          o.creado_at,
          COALESCE(u.nombre, 'Cliente sin registro') AS cliente,
          u.email AS cliente_email
        FROM ordenes o
        LEFT JOIN usuarios u ON u.id = o.usuario_id
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
    ]);

    const [salesRows] = salesResult;
    const [inventoryRows] = inventoryResult;
    const [userStatsRows] = userStatsResult;
    const [featuredRows] = featuredResult;
    const [recentOrders] = recentOrdersResult;
    const [categories] = categoriesResult;
    const [users] = usersResult;
    const [products] = productsResult;

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
      recentOrders,
      categoryBreakdown: categories,
      users: users.map(normalizeDashboardUser),
      products,
      alerts,
    });
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
      `SELECT o.id, o.total, o.estado, o.creado_at,
              COALESCE(u.nombre, 'Cliente sin registro') AS cliente,
              u.email AS cliente_email
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

    res.json({ ...orderRows[0], items });
  } catch (error) {
    next(error);
  }
}
