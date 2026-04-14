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
    const { nombre, descripcion, precio, imagen_url, stock } = req.body;
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, imagen_url, stock) VALUES (?, ?, ?, ?, ?)',
      [nombre, descripcion, precio, imagen_url, stock || 0]
    );
    res.status(201).json({ id: result.insertId, nombre, descripcion, precio, imagen_url, stock: stock || 0 });
  } catch (error) {
    next(error);
  }
}
