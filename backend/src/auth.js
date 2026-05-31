import jwt from 'jsonwebtoken';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'azami-local-dev-secret';
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || 'azami-refresh-local-dev-secret';
}

// Access token: 15 minutos (como Amazon, Mercado Libre, etc.)
export function signAuthToken(user, options = {}) {
  return jwt.sign(
    {
      sub: String(user.id),
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      mock: options.mock === true,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// Refresh token: 30 días, solo contiene el sub
export function signRefreshToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    getRefreshSecret(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}
