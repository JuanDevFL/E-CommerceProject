import dotenv from 'dotenv';
import pool from '../db.js';
import { archivedSeedProductNames, seedProducts } from '../data/seedProducts.js';

dotenv.config();

const databaseName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'ecommerce_db';

const productColumns = [
  {
    name: 'catalogo_codigo',
    sql: 'ALTER TABLE productos ADD COLUMN catalogo_codigo VARCHAR(80) NULL AFTER id'
  },
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
      catalogo_codigo VARCHAR(80) NULL,
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

async function retireLegacySeedProducts() {
  if (!archivedSeedProductNames.length) {
    return { archived: 0, deleted: 0 };
  }

  const placeholders = archivedSeedProductNames.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, COUNT(oi.id) AS referencesCount
     FROM productos p
     LEFT JOIN orden_items oi ON oi.producto_id = p.id
     WHERE p.nombre IN (${placeholders})
     GROUP BY p.id, p.nombre`,
    archivedSeedProductNames
  );

  let archived = 0;
  let deleted = 0;

  for (const row of rows) {
    if (Number(row.referencesCount || 0) > 0) {
      await pool.query(
        'UPDATE productos SET stock = 0, etiqueta = ? WHERE id = ?',
        ['Archivado', row.id]
      );
      archived += 1;
      continue;
    }

    await pool.query('DELETE FROM productos WHERE id = ?', [row.id]);
    deleted += 1;
  }

  return { archived, deleted };
}

async function seedCatalog() {
  let inserted = 0;
  let updated = 0;

  for (const product of seedProducts) {
    const lookupNames = [product.nombre, product.legacy_nombre].filter(Boolean);
    const placeholders = lookupNames.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id
       FROM productos
       WHERE catalogo_codigo = ? OR nombre IN (${placeholders})
       LIMIT 1`,
      [product.catalogo_codigo, ...lookupNames]
    );

    if (rows.length > 0) {
      await pool.query(
        `UPDATE productos
         SET catalogo_codigo = ?, nombre = ?, descripcion = ?, precio = ?, imagen_url = ?, stock = ?, categoria = ?, tono = ?, material = ?, etiqueta = ?
         WHERE id = ?`,
        [
          product.catalogo_codigo,
          product.nombre,
          product.descripcion,
          product.precio,
          product.imagen_url,
          product.stock,
          product.categoria,
          product.tono,
          product.material,
          product.etiqueta,
          rows[0].id,
        ]
      );
      updated += 1;
    } else {
      await pool.query(
        `INSERT INTO productos (catalogo_codigo, nombre, descripcion, precio, imagen_url, stock, categoria, tono, material, etiqueta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.catalogo_codigo,
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

  const retired = await retireLegacySeedProducts();

  console.log(
    `Seed completado: ${inserted} insertados, ${updated} actualizados, ${retired.deleted} retirados y ${retired.archived} archivados.`
  );
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