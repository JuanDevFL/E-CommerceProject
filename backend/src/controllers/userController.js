import crypto from 'node:crypto';
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

export async function forgotPassword(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    const successMessage = 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

    const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ message: successMessage });
    }

    const user = rows[0];

    // Invalidate any previous unused tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET usado = TRUE WHERE usuario_id = ? AND usado = FALSE',
      [user.id]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiraAt]
    );

    const resetUrl = `http://localhost:5173/reset-password/${token}`;
    console.log(`\n🔑 Enlace de restablecimiento para ${email}:\n   ${resetUrl}\n`);

    res.json({ message: successMessage });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.query(
      'SELECT id, usuario_id FROM password_reset_tokens WHERE token_hash = ? AND usado = FALSE AND expira_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });
    }

    const resetRecord = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, resetRecord.usuario_id]);
    await pool.query('UPDATE password_reset_tokens SET usado = TRUE WHERE id = ?', [resetRecord.id]);

    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    next(error);
  }
}
