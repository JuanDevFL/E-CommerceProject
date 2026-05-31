import pool from '../db.js';

export async function getProductos(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    res.json(rows);
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

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    const [result] = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, imagen_url, stock, categoria, tono, material, etiqueta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion,
        precio,
        imagen_url,
        stock || 0,
        categoria || 'Colección Azami',
        tono || 'Crema',
        material || 'Cuero premium',
        etiqueta || 'Online',
      ]
    );
    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion,
      precio,
      imagen_url,
      stock: stock || 0,
      categoria: categoria || 'Colección Azami',
      tono: tono || 'Crema',
      material: material || 'Cuero premium',
      etiqueta: etiqueta || 'Online',
    });
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

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    await pool.query(
      `UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, imagen_url = ?, stock = ?, categoria = ?, tono = ?, material = ?, etiqueta = ? WHERE id = ?`,
      [nombre, descripcion, precio, imagen_url, stock, categoria, tono, material, etiqueta, productId]
    );

    res.json({ id: productId, nombre, descripcion, precio, imagen_url, stock, categoria, tono, material, etiqueta });
  } catch (error) {
    next(error);
  }
}
