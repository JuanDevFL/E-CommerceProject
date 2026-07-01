import dotenv from 'dotenv';
import pool from '../db.js';
import { seedProducts } from '../data/seedProducts.js';

dotenv.config();

const databaseName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'ecommerce_db';

const productColumns = [
  {
    name: 'categoria',
    sql: "ALTER TABLE productos ADD COLUMN categoria VARCHAR(120) DEFAULT 'Colección Azami' AFTER stock"
  },
  {
    name: 'tono',
    sql: "ALTER TABLE productos ADD COLUMN tono VARCHAR(120) DEFAULT 'Crema' AFTER categoria"
  },
  {
    name: 'material',
    sql: "ALTER TABLE productos ADD COLUMN material VARCHAR(120) DEFAULT 'Cuero premium' AFTER tono"
  },
  {
    name: 'etiqueta',
    sql: "ALTER TABLE productos ADD COLUMN etiqueta VARCHAR(120) DEFAULT 'Online' AFTER material"
  }
];

async function ensureProductosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,
      precio DECIMAL(10,2) NOT NULL,
      imagen_url VARCHAR(500),
      stock INT DEFAULT 0,
      categoria VARCHAR(120) DEFAULT 'Colección Azami',
      tono VARCHAR(120) DEFAULT 'Crema',
      material VARCHAR(120) DEFAULT 'Cuero premium',
      etiqueta VARCHAR(120) DEFAULT 'Online',
      creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureProductColumns() {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'productos'`,
    [databaseName]
  );

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

  for (const column of productColumns) {
    if (!existingColumns.has(column.name)) {
      await pool.query(column.sql);
    }
  }
}

async function seedCatalog() {
  let inserted = 0;
  let updated = 0;

  for (const product of seedProducts) {
    const [rows] = await pool.query('SELECT id FROM productos WHERE nombre = ? LIMIT 1', [product.nombre]);

    if (rows.length > 0) {
      await pool.query(
        `UPDATE productos
         SET descripcion = ?, precio = ?, imagen_url = ?, stock = ?, categoria = ?, tono = ?, material = ?, etiqueta = ?
         WHERE nombre = ?`,
        [
          product.descripcion,
          product.precio,
          product.imagen_url,
          product.stock,
          product.categoria,
          product.tono,
          product.material,
          product.etiqueta,
          product.nombre,
        ]
      );
      updated += 1;
    } else {
      await pool.query(
        `INSERT INTO productos (nombre, descripcion, precio, imagen_url, stock, categoria, tono, material, etiqueta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.nombre,
          product.descripcion,
          product.precio,
          product.imagen_url,
          product.stock,
          product.categoria,
          product.tono,
          product.material,
          product.etiqueta,
        ]
      );
      inserted += 1;
    }
  }

  console.log(`Seed completado: ${inserted} insertados, ${updated} actualizados.`);
}

async function run() {
  try {
    await ensureProductosTable();
    await ensureProductColumns();
    await seedCatalog();
  } catch (error) {
    console.error('No se pudo sembrar el catálogo:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();