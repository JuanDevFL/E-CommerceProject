import jwt from 'jsonwebtoken';

const DEV_JWT_SECRET = 'azami-local-dev-secret';
const DEV_REFRESH_SECRET = 'azami-refresh-local-dev-secret';

function getJwtSecret() {
  return process.env.JWT_SECRET || DEV_JWT_SECRET;
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET;
}

/**
 * En producción los secretos JWT NUNCA pueden ser los valores por defecto
 * (que son públicos en el repositorio). Si lo son, un atacante podría firmar
 * tokens de administrador. Se aborta el arranque para evitar esa fuga.
 */
export function assertAuthSecretsAreSafe() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const problems = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    problems.push('JWT_SECRET');
  }

  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET) {
    problems.push('JWT_REFRESH_SECRET');
  }

  if (problems.length > 0) {
    throw new Error(
      `Configuración insegura: ${problems.join(', ')} debe definirse con un valor aleatorio único en producción. ` +
      'Genera cada uno con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  if ((process.env.AUTH_LOGIN_MODE || 'database').trim().toLowerCase() === 'mock') {
    throw new Error(
      'Configuración insegura: AUTH_LOGIN_MODE=mock usa credenciales de prueba fijas y no puede usarse en producción. Usa AUTH_LOGIN_MODE=database.'
    );
  }
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
