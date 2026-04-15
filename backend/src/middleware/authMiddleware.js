import pool from '../db.js';
import { verifyAuthToken } from '../auth.js';
import { normalizeUserRole } from '../userSchema.js';

function getBearerToken(req) {
  const authHeader = req.get('Authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
  }

  try {
    const payload = verifyAuthToken(token);

    if (payload.mock === true) {
      req.user = {
        id: Number(payload.sub),
        nombre: payload.nombre || 'Usuario de prueba',
        email: payload.email,
        rol: normalizeUserRole(payload.rol),
        authSource: 'mock',
      };

      next();
      return;
    }

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'La sesión ya no es válida' });
    }

    const [user] = rows;
    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: normalizeUserRole(user.rol),
      authSource: 'database',
    };

    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  next();
}
