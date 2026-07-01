import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

const ORDER_COUNT = 12;

async function seedOrders() {
  console.log('Obteniendo usuarios y productos existentes...');

  const [users] = await pool.query('SELECT id FROM usuarios');
  const [products] = await pool.query('SELECT id, precio FROM productos');

  if (users.length === 0 || products.length === 0) {
    console.error('Se necesitan usuarios y productos antes de crear órdenes.');
    process.exit(1);
  }

  const estados = ['pendiente', 'pago_confirmado', 'enviado', 'entregado'];

  let ordenesCreadas = 0;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const estado = estados[Math.floor(Math.random() * estados.length)];

    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const cantidad = Math.floor(Math.random() * 3) + 1;
      items.push({ producto_id: product.id, cantidad, precio: Number(product.precio) });
    }

    const total = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);

    const daysAgo = Math.floor(Math.random() * 30);
    const creado_at = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ');

    const [orderResult] = await pool.query(
      'INSERT INTO ordenes (usuario_id, total, estado, creado_at) VALUES (?, ?, ?, ?)',
      [user.id, total.toFixed(2), estado, creado_at]
    );

    const ordenId = orderResult.insertId;

    for (const item of items) {
      await pool.query(
        'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
        [ordenId, item.producto_id, item.cantidad, item.precio.toFixed(2)]
      );
    }

    ordenesCreadas++;
  }

  console.log(`${ordenesCreadas} órdenes ficticias creadas.`);
  await pool.end();
  process.exit(0);
}

seedOrders().catch((err) => {
  console.error('Error al crear órdenes:', err);
  process.exit(1);
});
