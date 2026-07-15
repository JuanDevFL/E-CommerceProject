import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

const PRODUCT_NAME = 'PRUEBA IMG';

const demoImageUrls = [
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
];

const demoColorVariants = [
  {
    nombre: 'Negro',
    hex: '#121212',
    imagen_url: demoImageUrls[0],
  },
  {
    nombre: 'Marfil',
    hex: '#F6F0E6',
    imagen_url: demoImageUrls[1],
  },
  {
    nombre: 'Verde oliva',
    hex: '#556B2F',
    imagen_url: demoImageUrls[2],
  },
];

async function upsertDemoProduct() {
  const payload = {
    nombre: PRODUCT_NAME,
    descripcion: 'Producto de prueba para validar mini carrusel de 3 imagenes y cambio de imagen por color en la tarjeta.',
    precio: 299000,
    imagen_url: demoImageUrls[0],
    image_urls: JSON.stringify(demoImageUrls),
    stock: 12,
    categoria: 'Cross Body',
    tono: 'Negro',
    color_variants_json: JSON.stringify(demoColorVariants),
    material: 'Cuero premium',
    etiqueta: 'Prueba carousel',
  };

  const [existing] = await pool.query('SELECT id FROM productos WHERE nombre = ? LIMIT 1', [PRODUCT_NAME]);

  if (existing.length > 0) {
    const productId = existing[0].id;
    await pool.query(
      `UPDATE productos
       SET descripcion = ?, precio = ?, imagen_url = ?, image_urls = ?, stock = ?, categoria = ?, tono = ?, color_variants_json = ?, material = ?, etiqueta = ?
       WHERE id = ?`,
      [
        payload.descripcion,
        payload.precio,
        payload.imagen_url,
        payload.image_urls,
        payload.stock,
        payload.categoria,
        payload.tono,
        payload.color_variants_json,
        payload.material,
        payload.etiqueta,
        productId,
      ]
    );
    console.log(`Producto ${PRODUCT_NAME} actualizado (id=${productId}).`);
    return;
  }

  const [result] = await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio, imagen_url, image_urls, stock, categoria, tono, color_variants_json, material, etiqueta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.nombre,
      payload.descripcion,
      payload.precio,
      payload.imagen_url,
      payload.image_urls,
      payload.stock,
      payload.categoria,
      payload.tono,
      payload.color_variants_json,
      payload.material,
      payload.etiqueta,
    ]
  );

  console.log(`Producto ${PRODUCT_NAME} creado (id=${result.insertId}).`);
}

async function run() {
  try {
    await upsertDemoProduct();
  } catch (error) {
    console.error('No se pudo crear/actualizar PRUEBA IMG:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
