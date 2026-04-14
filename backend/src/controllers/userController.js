import pool from '../db.js';

export async function registerUsuario(req, res, next) {
  try {
    const { nombre, email, password } = req.body;
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre, email, password]
    );

    res.status(201).json({ id: result.insertId, nombre, email });
  } catch (error) {
    next(error);
  }
}

export async function loginUsuario(req, res, next) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = ? AND password = ?', [email, password]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}
