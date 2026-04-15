import jwt from 'jsonwebtoken';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'azami-local-dev-secret';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

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
    { expiresIn: getJwtExpiresIn() }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}
