import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pool from '../db.js';
import {
  buildOfflineSalesTemplateBuffer,
  OFFLINE_SALES_TEMPLATE_FILENAME,
} from '../services/offlineSalesTemplate.js';

async function loadProducts() {
  try {
    const [products] = await pool.query(
      `SELECT id, nombre, categoria, tono, material, precio, stock
       FROM productos
       ORDER BY nombre ASC`
    );

    return products;
  } catch (error) {
    console.warn('No se pudo cargar el catalogo desde la base de datos. Se generara la plantilla sin hoja de referencia poblada.');
    return [];
  }
}

async function main() {
  const products = await loadProducts();
  const buffer = buildOfflineSalesTemplateBuffer(products);
  const outputPath = resolve(process.cwd(), 'templates', OFFLINE_SALES_TEMPLATE_FILENAME);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  console.log(`Plantilla generada en ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });