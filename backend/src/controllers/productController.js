import pool from '../db.js';

function parseJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeImageUrls(rawImageUrls, fallbackImage) {
  const fallback = String(fallbackImage || '').trim();
  const candidates = parseJsonArray(rawImageUrls)
    .map((url) => String(url || '').trim())
    .filter(Boolean);

  if (fallback) {
    candidates.unshift(fallback);
  }

  const unique = [...new Set(candidates)].slice(0, 3);

  if (!unique.length) {
    return [];
  }

  while (unique.length < 3) {
    unique.push(unique[unique.length - 1]);
  }

  return unique;
}

function normalizeColorVariants(rawVariants, { fallbackTone, fallbackImage, imageUrls }) {
  const normalizedFallbackTone = String(fallbackTone || '').trim() || 'Base';
  const normalizedFallbackImage = String(fallbackImage || '').trim() || imageUrls[0] || '';

  const parsedVariants = parseJsonArray(rawVariants)
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const nombre = String(variant.nombre || variant.name || '').trim();
      if (!nombre) return null;
      const hex = String(variant.hex || '').trim();
      const imagen_url = String(variant.imagen_url || variant.image_url || variant.image || '').trim();
      const variantImageUrls = normalizeImageUrls(
        variant.image_urls,
        imagen_url || imageUrls[0] || normalizedFallbackImage
      );

      return {
        nombre,
        hex,
        imagen_url: variantImageUrls[0] || imagen_url || imageUrls[0] || normalizedFallbackImage,
        image_urls: variantImageUrls,
      };
    })
    .filter(Boolean);

  if (!parsedVariants.length) {
    return [{
      nombre: normalizedFallbackTone,
      hex: '',
      imagen_url: normalizedFallbackImage,
      image_urls: normalizeImageUrls(imageUrls, normalizedFallbackImage),
    }];
  }

  return parsedVariants;
}

function normalizeProductRow(row) {
  const image_urls = normalizeImageUrls(row.image_urls, row.imagen_url);
  const color_variants = normalizeColorVariants(row.color_variants_json, {
    fallbackTone: row.tono,
    fallbackImage: row.imagen_url,
    imageUrls: image_urls,
  });

  return {
    ...row,
    imagen_url: row.imagen_url || image_urls[0] || '',
    image_urls,
    color_variants,
  };
}

export async function getProductos(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    res.json(rows.map(normalizeProductRow));
  } catch (error) {
    next(error);
  }
}

export async function createProducto(req, res, next) {
  try {
    const nombre = req.body.nombre?.trim();
    const descripcion = req.body.descripcion?.trim() || '';
    const imagen_url = req.body.imagen_url?.trim() || '';
    const categoria = req.body.categoria?.trim() || 'Colección Azami';
    const tono = req.body.tono?.trim() || 'Crema';
    const material = req.body.material?.trim() || 'Cuero premium';
    const etiqueta = req.body.etiqueta?.trim() || 'Online';
    const precio = Number(req.body.precio);
    const stock = Number.isFinite(Number(req.body.stock)) ? Math.max(0, Number(req.body.stock)) : 0;
    const imageUrls = normalizeImageUrls(req.body.image_urls, imagen_url);
    const colorVariants = normalizeColorVariants(req.body.color_variants, {
      fallbackTone: tono,
      fallbackImage: imagen_url,
      imageUrls,
    });

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    const [result] = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, imagen_url, image_urls, stock, categoria, tono, color_variants_json, material, etiqueta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion,
        precio,
        imageUrls[0] || imagen_url,
        JSON.stringify(imageUrls),
        stock || 0,
        categoria || 'Colección Azami',
        tono || 'Crema',
        JSON.stringify(colorVariants),
        material || 'Cuero premium',
        etiqueta || 'Online',
      ]
    );
    res.status(201).json(normalizeProductRow({
      id: result.insertId,
      nombre,
      descripcion,
      precio,
      imagen_url: imageUrls[0] || imagen_url,
      image_urls: imageUrls,
      stock: stock || 0,
      categoria: categoria || 'Colección Azami',
      tono: tono || 'Crema',
      color_variants_json: JSON.stringify(colorVariants),
      material: material || 'Cuero premium',
      etiqueta: etiqueta || 'Online',
    }));
  } catch (error) {
    next(error);
  }
}

export async function updateProducto(req, res, next) {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'El identificador del producto no es válido' });
    }

    const [existing] = await pool.query('SELECT id FROM productos WHERE id = ? LIMIT 1', [productId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const nombre = req.body.nombre?.trim();
    const descripcion = req.body.descripcion?.trim() || '';
    const imagen_url = req.body.imagen_url?.trim() || '';
    const categoria = req.body.categoria?.trim() || 'Colección Azami';
    const tono = req.body.tono?.trim() || 'Crema';
    const material = req.body.material?.trim() || 'Cuero premium';
    const etiqueta = req.body.etiqueta?.trim() || 'Online';
    const precio = Number(req.body.precio);
    const stock = Number.isFinite(Number(req.body.stock)) ? Math.max(0, Number(req.body.stock)) : 0;
    const imageUrls = normalizeImageUrls(req.body.image_urls, imagen_url);
    const colorVariants = normalizeColorVariants(req.body.color_variants, {
      fallbackTone: tono,
      fallbackImage: imagen_url,
      imageUrls,
    });

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    await pool.query(
      `UPDATE productos
       SET nombre = ?, descripcion = ?, precio = ?, imagen_url = ?, image_urls = ?, stock = ?, categoria = ?, tono = ?, color_variants_json = ?, material = ?, etiqueta = ?
       WHERE id = ?`,
      [
        nombre,
        descripcion,
        precio,
        imageUrls[0] || imagen_url,
        JSON.stringify(imageUrls),
        stock,
        categoria,
        tono,
        JSON.stringify(colorVariants),
        material,
        etiqueta,
        productId,
      ]
    );

    res.json(normalizeProductRow({
      id: productId,
      nombre,
      descripcion,
      precio,
      imagen_url: imageUrls[0] || imagen_url,
      image_urls: imageUrls,
      stock,
      categoria,
      tono,
      color_variants_json: JSON.stringify(colorVariants),
      material,
      etiqueta,
    }));
  } catch (error) {
    next(error);
  }
}
