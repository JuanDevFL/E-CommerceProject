import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../db.js';
import { getSeedUsers } from '../data/seedUsers.js';
import { ensureUsuariosTable, normalizeUserRole } from '../userSchema.js';

dotenv.config();

async function seedUsuarios() {
  let inserted = 0;
  let updated = 0;

  for (const account of getSeedUsers()) {
    const nombre = account.nombre.trim();
    const email = account.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(account.password, 10);
    const rol = normalizeUserRole(account.rol);

    const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);

    if (rows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET nombre = ?, password = ?, rol = ? WHERE id = ?',
        [nombre, passwordHash, rol, rows[0].id]
      );
      updated += 1;
      continue;
    }

    await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, passwordHash, rol]
    );
    inserted += 1;
  }

  console.log(`Seed de usuarios completado: ${inserted} insertados, ${updated} actualizados.`);
}

async function run() {
  try {
    await ensureUsuariosTable();
    await seedUsuarios();
  } catch (error) {
    console.error('No se pudo sembrar los usuarios:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
