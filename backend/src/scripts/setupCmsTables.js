/**
 * Crea las tablas CMS y las puebla con los datos actuales.
 * Uso: node src/scripts/setupCmsTables.js
 */
import pool from '../db.js';

async function run() {
  console.log('Creando tablas CMS...\n');

  // ── catalog_filters ─────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS catalog_filters (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      tipo      ENUM('categoria','tono') NOT NULL,
      valor     VARCHAR(120) NOT NULL,
      orden     INT DEFAULT 0,
      activo    BOOLEAN DEFAULT TRUE,
      creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tipo_valor (tipo, valor)
    )
  `);
  console.log('✓ catalog_filters');

  // ── site_content ─────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      seccion        VARCHAR(80) NOT NULL,
      clave          VARCHAR(80) NOT NULL,
      valor          TEXT,
      actualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_seccion_clave (seccion, clave)
    )
  `);
  console.log('✓ site_content');

  // ── carousel_slides ───────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carousel_slides (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      eyebrow     VARCHAR(255),
      titulo      VARCHAR(255),
      descripcion TEXT,
      imagen_url  VARCHAR(500),
      orden       INT DEFAULT 0,
      activo      BOOLEAN DEFAULT TRUE
    )
  `);
  console.log('✓ carousel_slides\n');

  // ── Seed catalog_filters desde productos existentes ───────────────────────
  const [cats] = await pool.query(`SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != ''`);
  const [tons] = await pool.query(`SELECT DISTINCT tono     FROM productos WHERE tono      IS NOT NULL AND tono      != ''`);

  for (const [i, row] of cats.entries()) {
    await pool.query(
      `INSERT IGNORE INTO catalog_filters (tipo, valor, orden) VALUES ('categoria', ?, ?)`,
      [row.categoria, i]
    );
    console.log(`  categoría: ${row.categoria}`);
  }
  for (const [i, row] of tons.entries()) {
    await pool.query(
      `INSERT IGNORE INTO catalog_filters (tipo, valor, orden) VALUES ('tono', ?, ?)`,
      [row.tono, i]
    );
    console.log(`  tono: ${row.tono}`);
  }

  // ── Seed carousel_slides ──────────────────────────────────────────────────
  const defaultSlides = [
    {
      eyebrow: 'Editorial Azami',
      titulo: 'Piezas con estructura y presencia.',
      descripcion: 'Diseños que equilibran forma, durabilidad y elegancia natural para acompañarte cada día.',
      imagen_url: 'https://images.pexels.com/photos/35666033/pexels-photo-35666033.jpeg?auto=compress&cs=tinysrgb&w=1600',
      orden: 0,
    },
    {
      eyebrow: 'Selección cápsula',
      titulo: 'Color, textura y detalle artesanal.',
      descripcion: 'Materiales premium seleccionados a mano en tonos que se adaptan a tu estilo y personalidad.',
      imagen_url: 'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
      orden: 1,
    },
    {
      eyebrow: 'Estilo de estudio',
      titulo: 'Contraste limpio para la colección.',
      descripcion: 'Una selección de contrastes audaces que dan carácter a cada conjunto, de día o de noche.',
      imagen_url: 'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
      orden: 2,
    },
    {
      eyebrow: 'Avance de temporada',
      titulo: 'Siluetas compactas y acabados suaves.',
      descripcion: 'Formatos pensados para el movimiento moderno: ligeros, versátiles y con acabado de lujo artesanal.',
      imagen_url: 'https://images.pexels.com/photos/5706269/pexels-photo-5706269.jpeg?auto=compress&cs=tinysrgb&w=1600',
      orden: 3,
    },
  ];

  const [existing] = await pool.query('SELECT COUNT(*) AS n FROM carousel_slides');
  if (existing[0].n === 0) {
    for (const s of defaultSlides) {
      await pool.query(
        `INSERT INTO carousel_slides (eyebrow, titulo, descripcion, imagen_url, orden) VALUES (?, ?, ?, ?, ?)`,
        [s.eyebrow, s.titulo, s.descripcion, s.imagen_url, s.orden]
      );
      console.log(`  slide: ${s.titulo}`);
    }
  } else {
    console.log('  carousel_slides ya tiene datos, omitiendo seed.');
  }

  // ── Seed site_content ─────────────────────────────────────────────────────
  const defaultContent = [
    { seccion: 'home', clave: 'hero_titulo',   valor: 'Lujo artesanal' },
    { seccion: 'home', clave: 'hero_tagline',  valor: 'Bolsos · Colección 2026' },
    { seccion: 'home', clave: 'hero_subtitulo', valor: 'Descubre diseños artesanales pensados para acompañarte con estilo y durabilidad.' },
    { seccion: 'home', clave: 'hero_cta',       valor: 'Ver colección →' },
    { seccion: 'catalogo', clave: 'eyebrow',    valor: 'Selección Azami' },
    { seccion: 'catalogo', clave: 'titulo',     valor: 'Catálogo curado con filtros por estilo y tono' },
    { seccion: 'catalogo', clave: 'descripcion', valor: 'Empezamos con una selección editorial para que la tienda tenga producto realista desde ahora, mientras el catálogo en vivo sigue creciendo.' },
    { seccion: 'about', clave: 'titulo',         valor: 'AZAMI' },
    { seccion: 'about', clave: 'subtitulo',      valor: 'Lujo artesanal con alma contemporánea' },
    { seccion: 'about', clave: 'descripcion',    valor: 'Azami Studio crea piezas de cuero artesanal que combinan diseño contemporáneo con técnicas de manufactura de alta calidad.' },
    { seccion: 'contacto', clave: 'email',       valor: 'azami.oficial@gmail.com' },
    { seccion: 'contacto', clave: 'whatsapp',    valor: '3004651366' },
  ];

  for (const item of defaultContent) {
    await pool.query(
      `INSERT IGNORE INTO site_content (seccion, clave, valor) VALUES (?, ?, ?)`,
      [item.seccion, item.clave, item.valor]
    );
  }
  console.log('\n✅ Tablas CMS listas y datos iniciales insertados.');
  await pool.end();
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
