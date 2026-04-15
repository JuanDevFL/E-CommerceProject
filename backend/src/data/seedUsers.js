export function getSeedUsers() {
  return [
    {
      nombre: process.env.SEED_ADMIN_NAME || 'Admin Azami',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@azami.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'AdminAzami2026!',
      rol: 'admin',
    },
    {
      nombre: process.env.SEED_USER_NAME || 'Cliente Azami',
      email: process.env.SEED_USER_EMAIL || 'cliente@azami.com',
      password: process.env.SEED_USER_PASSWORD || 'ClienteAzami2026!',
      rol: 'user',
    },
  ];
}
