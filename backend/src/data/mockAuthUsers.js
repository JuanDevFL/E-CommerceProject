import { normalizeUserRole } from '../userSchema.js';

function toMockUserId(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isMockLoginMode() {
  return (process.env.AUTH_LOGIN_MODE || 'database').trim().toLowerCase() === 'mock';
}

export function getMockAuthUsers() {
  return [
    {
      id: toMockUserId(process.env.MOCK_ADMIN_ID, 9001),
      nombre: process.env.MOCK_ADMIN_NAME || 'Admin Azami Test',
      email: (process.env.MOCK_ADMIN_EMAIL || 'admin.test@azami.com').trim().toLowerCase(),
      password: process.env.MOCK_ADMIN_PASSWORD || 'AdminTest2026!',
      rol: normalizeUserRole(process.env.MOCK_ADMIN_ROLE || 'admin'),
    },
    {
      id: toMockUserId(process.env.MOCK_USER_ID, 9002),
      nombre: process.env.MOCK_USER_NAME || 'Cliente Azami Test',
      email: (process.env.MOCK_USER_EMAIL || 'cliente.test@azami.com').trim().toLowerCase(),
      password: process.env.MOCK_USER_PASSWORD || 'ClienteTest2026!',
      rol: normalizeUserRole(process.env.MOCK_USER_ROLE || 'user'),
    },
  ];
}

export function findMockAuthUser(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return getMockAuthUsers().find((user) => user.email === normalizedEmail) || null;
}
