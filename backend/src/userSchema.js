import pool from './db.js';

const validRoles = new Set(['user', 'admin']);

export async function ensureUsuariosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      rol ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const databaseName = process.env.DB_NAME || 'ecommerce_db';
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'`,
    [databaseName]
  );

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

  if (!existingColumns.has('rol')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN rol ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password");
  }

  await pool.query(
    "UPDATE usuarios SET rol = 'user' WHERE rol IS NULL OR rol NOT IN ('user', 'admin')"
  );
}

export async function ensurePasswordResetTokensTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expira_at TIMESTAMP NOT NULL,
      usado BOOLEAN DEFAULT FALSE,
      creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);
}

export function normalizeUserRole(role) {
  return validRoles.has(role) ? role : 'user';
}
