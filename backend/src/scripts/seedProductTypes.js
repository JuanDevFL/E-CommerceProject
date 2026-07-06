/**
 * Asigna aleatoriamente un tipo de bolso (categoria) a todos los productos.
 * Tipos: Carteras | Mini morrales | Bandoleras | Cross Body
 * Uso: node src/scripts/seedProductTypes.js
 */
import pool from '../db.js';

const TIPOS = ['Carteras', 'Mini morrales', 'Bandoleras', 'Cross Body'];

async function seedProductTypes() {
  const [rows] = await pool.query('SELECT id, nombre FROM productos ORDER BY id');

  if (!rows.length) {
    console.log('No hay productos en la base de datos.');
    await pool.end();
    return;
  }

  console.log(`Actualizando ${rows.length} productos con tipos aleatorios...\n`);

  for (const row of rows) {
    const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
    await pool.query('UPDATE productos SET categoria = ? WHERE id = ?', [tipo, row.id]);
    console.log(`  ✓ [${row.id}] ${row.nombre.padEnd(40)} → ${tipo}`);
  }

  console.log(`\n✅ Listo. ${rows.length} productos actualizados.`);
  await pool.end();
}

seedProductTypes().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
