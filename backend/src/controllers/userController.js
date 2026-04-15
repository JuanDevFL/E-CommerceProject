import bcrypt from 'bcryptjs';
import { signAuthToken } from '../auth.js';
import { findMockAuthUser, isMockLoginMode } from '../data/mockAuthUsers.js';
import pool from '../db.js';
import { normalizeUserRole } from '../userSchema.js';

export async function registerUsuario(req, res, next) {
  try {
    const nombre = req.body.nombre?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const rol = 'user';

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, passwordHash, rol]
    );

    const token = signAuthToken({ id: result.insertId, email, rol });

    res.status(201).json({ id: result.insertId, nombre, email, rol, token });
  } catch (error) {
    next(error);
  }
}

export async function loginUsuario(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    if (isMockLoginMode()) {
      const mockUser = findMockAuthUser(email);

      if (!mockUser || mockUser.password !== password) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = signAuthToken(
        {
          id: mockUser.id,
          nombre: mockUser.nombre,
          email: mockUser.email,
          rol: mockUser.rol,
        },
        { mock: true }
      );

      res.json({
        id: mockUser.id,
        nombre: mockUser.nombre,
        email: mockUser.email,
        rol: mockUser.rol,
        token,
        authSource: 'mock',
      });
      return;
    }

    const [rows] = await pool.query('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const [user] = rows;
    const rol = normalizeUserRole(user.rol);
    const passwordsMatch = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!passwordsMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.password.startsWith('$2')) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, user.id]);
    }

    const token = signAuthToken({
      id: user.id,
      email: user.email,
      rol,
    });

    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol,
      token,
      authSource: 'database',
    });
  } catch (error) {
    next(error);
  }
}
