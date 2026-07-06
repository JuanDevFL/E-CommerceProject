/**
 * Asigna aleatoriamente un tono a todos los productos.
 * Uso: npm run seed:tonos
 */
import pool from '../db.js';

const TONOS = [
  'Negro', 'Talco', 'Beige', 'Vinotinto', 'Azul',
  'Palo de rosa', 'Verde oliva', 'Amarillo mantequilla',
  'Rojo', 'Miel', 'Café moca', 'Verde',
];

async function seedTonos() {
  const [rows] = await pool.query('SELECT id, nombre FROM productos ORDER BY id');

  if (!rows.length) {
    console.log('No hay productos en la base de datos.');
    await pool.end();
    return;
  }

  console.log(`Actualizando ${rows.length} productos con tonos aleatorios...\n`);

  for (const row of rows) {
    const tono = TONOS[Math.floor(Math.random() * TONOS.length)];
    await pool.query('UPDATE productos SET tono = ? WHERE id = ?', [tono, row.id]);
    console.log(`  ✓ [${row.id}] ${row.nombre.padEnd(40)} → ${tono}`);
  }

  console.log(`\n✅ Listo. ${rows.length} productos actualizados.`);
  await pool.end();
}

seedTonos().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
