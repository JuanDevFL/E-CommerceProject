import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { signAuthToken, signRefreshToken, verifyRefreshToken } from '../auth.js';
import { findMockAuthUser, isMockLoginMode } from '../data/mockAuthUsers.js';
import pool from '../db.js';
import { sendPasswordResetEmail } from '../email.js';
import { validatePasswordPolicy } from '../passwordPolicy.js';
import { logActividad, normalizeUserRole } from '../userSchema.js';

const REFRESH_COOKIE = 'azami_rt';
const REFRESH_DAYS = 30;

function refreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // En producción frontend y backend están en dominios distintos (Vercel ≠ Railway)
    // → sameSite:'none' + secure:true son obligatorios para cookies cross-origin.
    // En desarrollo localhost sigue funcionando con 'lax'.
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

async function issueRefreshToken(userId, ip, res) {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiraAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (usuario_id, token_hash, expira_at, ip) VALUES (?, ?, ?, ?)',
    [userId, hash, expiraAt, ip]
  );

  res.cookie(REFRESH_COOKIE, raw, refreshCookieOptions());
}

async function revokeRefreshTokenByRaw(raw) {
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  await pool.query(
    'UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = ?',
    [hash]
  );
}

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

function clientUserAgent(req) {
  return req.headers['user-agent'] || null;
}

export async function registerUsuario(req, res, next) {
  try {
    const nombre = req.body.nombre?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const acceptTerms = req.body.acceptTerms === true;
    const acceptDataPolicy = req.body.acceptDataPolicy === true;
    const acceptMarketing = req.body.acceptMarketing === true;
    const consentVersion = req.body.consentVersion?.trim() || '2026-05-07';
    const rol = 'user';

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }

    if (!acceptTerms || !acceptDataPolicy) {
      return res.status(400).json({ error: 'Debes aceptar términos y autorizar el tratamiento de datos para registrarte' });
    }

    const passwordValidationError = validatePasswordPolicy(password);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO usuarios
        (nombre, email, password, rol, terminos_aceptados, datos_autorizados, marketing_autorizado, consentimiento_version, consentimiento_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        nombre,
        email,
        passwordHash,
        rol,
        acceptTerms,
        acceptDataPolicy,
        acceptMarketing,
        consentVersion,
      ]
    );

    const token = signAuthToken({ id: result.insertId, email, rol });
    await issueRefreshToken(result.insertId, clientIp(req), res);

    await logActividad({
      usuarioId: result.insertId,
      accion: 'registro',
      descripcion: `Nuevo usuario registrado: ${email}`,
      ip: clientIp(req),
      userAgent: clientUserAgent(req),
      resultado: 'ok',
    });

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
      await logActividad({
        accion: 'login_fallido',
        descripcion: `Correo no encontrado: ${email}`,
        ip: clientIp(req),
        userAgent: clientUserAgent(req),
        resultado: 'error',
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const [user] = rows;
    const rol = normalizeUserRole(user.rol);
    const passwordsMatch = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!passwordsMatch) {
      await logActividad({
        usuarioId: user.id,
        accion: 'login_fallido',
        descripcion: `Contraseña incorrecta para: ${email}`,
        ip: clientIp(req),
        userAgent: clientUserAgent(req),
        resultado: 'error',
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.password.startsWith('$2')) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, user.id]);
    }

    const token = signAuthToken({
      id: user.id,
      email: user.email,
      rol,
    });
    await issueRefreshToken(user.id, clientIp(req), res);

    await logActividad({
      usuarioId: user.id,
      accion: 'login_exitoso',
      descripcion: `Inicio de sesión: ${email}`,
      ip: clientIp(req),
      userAgent: clientUserAgent(req),
      resultado: 'ok',
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

export async function refreshToken(req, res, next) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];

    if (!raw) {
      return res.status(401).json({ error: 'No hay sesión activa' });
    }

    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    const [rows] = await pool.query(
      `SELECT rt.id, rt.usuario_id, u.nombre, u.email, u.rol
       FROM refresh_tokens rt
       JOIN usuarios u ON u.id = rt.usuario_id
       WHERE rt.token_hash = ? AND rt.revocado = FALSE AND rt.expira_at > NOW()
       LIMIT 1`,
      [hash]
    );

    if (rows.length === 0) {
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      return res.status(401).json({ error: 'La sesión expiró. Inicia sesión nuevamente.' });
    }

    const record = rows[0];
    const rol = normalizeUserRole(record.rol);

    // Rotación del refresh token: invalida el anterior, emite uno nuevo (protege contra robo de token)
    await pool.query('UPDATE refresh_tokens SET revocado = TRUE WHERE id = ?', [record.id]);
    await issueRefreshToken(record.usuario_id, clientIp(req), res);

    const newAccessToken = signAuthToken({
      id: record.usuario_id,
      email: record.email,
      rol,
    });

    res.json({
      token: newAccessToken,
      id: record.usuario_id,
      nombre: record.nombre,
      email: record.email,
      rol,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutUsuario(req, res, next) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];

    if (raw) {
      await revokeRefreshTokenByRaw(raw);
    }

    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    res.json({ message: 'Sesión cerrada correctamente' });
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

    const appUrl = String(process.env.FRONTEND_APP_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password/${token}`;
    await sendPasswordResetEmail({ to: email, resetUrl });

    await logActividad({
      usuarioId: rows.length > 0 ? rows[0].id : null,
      accion: 'forgot_password',
      descripcion: `Solicitud de recuperación para: ${email}`,
      ip: clientIp(req),
      userAgent: clientUserAgent(req),
      resultado: 'ok',
    });

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

    const passwordValidationError = validatePasswordPolicy(password);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
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
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, resetRecord.usuario_id]);
    await pool.query('UPDATE password_reset_tokens SET usado = TRUE WHERE id = ?', [resetRecord.id]);

    await logActividad({
      usuarioId: resetRecord.usuario_id,
      accion: 'reset_password',
      descripcion: 'Contraseña restablecida exitosamente',
      ip: clientIp(req),
      userAgent: clientUserAgent(req),
      resultado: 'ok',
    });

    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    next(error);
  }
}
