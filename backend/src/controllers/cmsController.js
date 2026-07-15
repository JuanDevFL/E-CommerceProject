import pool from '../db.js';

async function ensureDefaultSiteContent() {
  const defaults = [
    ['catalogo', 'eyebrow', 'Selección Azami'],
    ['catalogo', 'titulo', 'Catálogo curado con filtros por estilo y tono'],
    ['catalogo', 'descripcion', 'Empezamos con una selección editorial para que la tienda tenga producto realista desde ahora, mientras el catálogo en vivo sigue creciendo.'],
  ];

  for (const [seccion, clave, valor] of defaults) {
    await pool.query(
      `INSERT INTO site_content (seccion, clave, valor)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = valor`,
      [seccion, clave, valor]
    );
  }
}

// ─── PUBLIC (sin auth) ────────────────────────────────────────────────────────

export async function getPublicFilters(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, valor, orden FROM catalog_filters WHERE activo = TRUE ORDER BY tipo, orden, valor`
    );
    const categorias = rows.filter((r) => r.tipo === 'categoria').map((r) => r.valor);
    const tonos = rows.filter((r) => r.tipo === 'tono').map((r) => r.valor);
    res.json({ categorias, tonos });
  } catch (err) {
    res.json({ categorias: [], tonos: [] });
  }
}

export async function getPublicContent(req, res) {
  try {
    await ensureDefaultSiteContent();
    const [rows] = await pool.query(`SELECT seccion, clave, valor FROM site_content`);
    const content = {};
    for (const row of rows) {
      if (!content[row.seccion]) content[row.seccion] = {};
      content[row.seccion][row.clave] = row.valor;
    }
    res.json(content);
  } catch {
    res.json({});
  }
}

export async function getPublicCarousel(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, eyebrow, titulo, descripcion, imagen_url, orden FROM carousel_slides WHERE activo = TRUE ORDER BY orden`
    );
    res.json(rows);
  } catch {
    res.json([]);
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// ── Catalog filters ───────────────────────────────────────────────────────────

export async function getAdminFilters(req, res) {
  const [rows] = await pool.query(
    `SELECT id, tipo, valor, orden, activo FROM catalog_filters ORDER BY tipo, orden, valor`
  );
  const categorias = rows.filter((r) => r.tipo === 'categoria');
  const tonos = rows.filter((r) => r.tipo === 'tono');
  res.json({ categorias, tonos });
}

export async function addFilter(req, res) {
  const tipo = String(req.body.tipo || '').trim();
  const valor = String(req.body.valor || '').trim();
  if (!['categoria', 'tono'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser "categoria" o "tono".' });
  }
  if (!valor) {
    return res.status(400).json({ error: 'El valor no puede estar vacío.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO catalog_filters (tipo, valor) VALUES (?, ?)`,
      [tipo, valor]
    );
    res.status(201).json({ id: result.insertId, tipo, valor, orden: 0, activo: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe ese valor para el tipo indicado.' });
    }
    throw err;
  }
}

export async function deleteFilter(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido.' });
  }
  const [result] = await pool.query(`DELETE FROM catalog_filters WHERE id = ?`, [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Filtro no encontrado.' });
  }
  res.json({ ok: true });
}

// ── Site content ──────────────────────────────────────────────────────────────

export async function getAdminContent(req, res) {
  await ensureDefaultSiteContent();
  const [rows] = await pool.query(`SELECT id, seccion, clave, valor, actualizado_at FROM site_content ORDER BY seccion, clave`);
  const content = {};
  for (const row of rows) {
    if (!content[row.seccion]) content[row.seccion] = {};
    content[row.seccion][row.clave] = { id: row.id, valor: row.valor, actualizado_at: row.actualizado_at };
  }
  res.json(content);
}

export async function upsertContent(req, res) {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const updated = [];
  for (const item of items) {
    const seccion = String(item.seccion || '').trim();
    const clave = String(item.clave || '').trim();
    const valor = String(item.valor ?? '').trim();
    if (!seccion || !clave) continue;
    await pool.query(
      `INSERT INTO site_content (seccion, clave, valor)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [seccion, clave, valor]
    );
    updated.push({ seccion, clave });
  }
  res.json({ ok: true, updated: updated.length });
}

// ── Carousel slides ───────────────────────────────────────────────────────────

export async function getAdminCarousel(req, res) {
  const [rows] = await pool.query(
    `SELECT id, eyebrow, titulo, descripcion, imagen_url, orden, activo FROM carousel_slides ORDER BY orden`
  );
  res.json(rows);
}

export async function addSlide(req, res) {
  const eyebrow = String(req.body.eyebrow || '').trim();
  const titulo = String(req.body.titulo || '').trim();
  const descripcion = String(req.body.descripcion || '').trim();
  const imagen_url = String(req.body.imagen_url || '').trim();
  const orden = Number(req.body.orden ?? 0);

  if (!titulo || !imagen_url) {
    return res.status(400).json({ error: 'El título y la imagen son obligatorios.' });
  }

  const [result] = await pool.query(
    `INSERT INTO carousel_slides (eyebrow, titulo, descripcion, imagen_url, orden) VALUES (?, ?, ?, ?, ?)`,
    [eyebrow, titulo, descripcion, imagen_url, orden]
  );
  res.status(201).json({ id: result.insertId, eyebrow, titulo, descripcion, imagen_url, orden, activo: true });
}

export async function updateSlide(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });

  const eyebrow = String(req.body.eyebrow || '').trim();
  const titulo = String(req.body.titulo || '').trim();
  const descripcion = String(req.body.descripcion || '').trim();
  const imagen_url = String(req.body.imagen_url || '').trim();
  const orden = Number(req.body.orden ?? 0);
  const activo = req.body.activo !== false && req.body.activo !== 'false';

  const [result] = await pool.query(
    `UPDATE carousel_slides SET eyebrow = ?, titulo = ?, descripcion = ?, imagen_url = ?, orden = ?, activo = ? WHERE id = ?`,
    [eyebrow, titulo, descripcion, imagen_url, orden, activo, id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Slide no encontrado.' });
  res.json({ ok: true });
}

export async function deleteSlide(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
  const [result] = await pool.query(`DELETE FROM carousel_slides WHERE id = ?`, [id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Slide no encontrado.' });
  res.json({ ok: true });
}
