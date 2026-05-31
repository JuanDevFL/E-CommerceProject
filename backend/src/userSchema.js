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
      terminos_aceptados BOOLEAN NOT NULL DEFAULT FALSE,
      datos_autorizados BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_autorizado BOOLEAN NOT NULL DEFAULT FALSE,
      consentimiento_version VARCHAR(30) DEFAULT NULL,
      consentimiento_at TIMESTAMP NULL,
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

  if (!existingColumns.has('terminos_aceptados')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN terminos_aceptados BOOLEAN NOT NULL DEFAULT FALSE AFTER rol");
  }

  if (!existingColumns.has('datos_autorizados')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN datos_autorizados BOOLEAN NOT NULL DEFAULT FALSE AFTER terminos_aceptados");
  }

  if (!existingColumns.has('marketing_autorizado')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN marketing_autorizado BOOLEAN NOT NULL DEFAULT FALSE AFTER datos_autorizados");
  }

  if (!existingColumns.has('consentimiento_version')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN consentimiento_version VARCHAR(30) DEFAULT NULL AFTER marketing_autorizado");
  }

  if (!existingColumns.has('consentimiento_at')) {
    await pool.query("ALTER TABLE usuarios ADD COLUMN consentimiento_at TIMESTAMP NULL AFTER consentimiento_version");
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

export async function ensureActividadLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS actividad_logs (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      usuario_id  INT NULL,
      accion      VARCHAR(60)  NOT NULL,
      descripcion VARCHAR(500) NULL,
      ip          VARCHAR(45)  NULL,
      user_agent  VARCHAR(300) NULL,
      resultado   ENUM('ok', 'error', 'bloqueado') NOT NULL DEFAULT 'ok',
      creado_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario   (usuario_id),
      INDEX idx_accion    (accion),
      INDEX idx_creado_at (creado_at)
    )
  `);
}

/**
 * Registra una acción en actividad_logs sin lanzar excepción.
 * Se llama con await pero los fallos se silencian para no interrumpir el flujo principal.
 */
export async function logActividad({ usuarioId = null, accion, descripcion = null, ip = null, userAgent = null, resultado = 'ok' }) {
  try {
    await pool.query(
      `INSERT INTO actividad_logs (usuario_id, accion, descripcion, ip, user_agent, resultado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId || null, accion, descripcion, ip, userAgent ? userAgent.slice(0, 300) : null, resultado]
    );
  } catch {
    // log silencioso — nunca romper la request por fallar el audit log
  }
}

export async function ensureRefreshTokensTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      usuario_id  INT NOT NULL,
      token_hash  VARCHAR(255) NOT NULL UNIQUE,
      expira_at   TIMESTAMP NOT NULL,
      revocado    BOOLEAN DEFAULT FALSE,
      ip          VARCHAR(45) NULL,
      creado_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rt_usuario   (usuario_id),
      INDEX idx_rt_token     (token_hash),
      INDEX idx_rt_expira_at (expira_at)
    )
  `);
}

export async function ensureAddressesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS direcciones_envio (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id       INT NOT NULL,
      alias            VARCHAR(60)  NOT NULL DEFAULT 'Casa',
      nombre_receptor  VARCHAR(120) NOT NULL,
      telefono         VARCHAR(30)  NULL,
      calle            VARCHAR(255) NOT NULL,
      ciudad           VARCHAR(120) NOT NULL,
      estado           VARCHAR(120) NOT NULL,
      codigo_postal    VARCHAR(20)  NOT NULL,
      pais             VARCHAR(80)  NOT NULL DEFAULT 'México',
      es_principal     BOOLEAN DEFAULT FALSE,
      creado_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dir_usuario (usuario_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);
}

export function normalizeUserRole(role) {
  return validRoles.has(role) ? role : 'user';
}
