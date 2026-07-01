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

export async function ensureOrdersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id                   INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id           INT NULL,
      cliente_tipo         VARCHAR(20) NOT NULL DEFAULT 'registered',
      cliente_nombre       VARCHAR(255) NULL,
      cliente_email        VARCHAR(255) NULL,
      cliente_telefono     VARCHAR(30) NULL,
      subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
      envio                DECIMAL(10,2) NOT NULL DEFAULT 0,
      total                DECIMAL(10,2) NOT NULL,
      moneda               VARCHAR(3) NOT NULL DEFAULT 'COP',
      estado               VARCHAR(50) DEFAULT 'pendiente',
      referencia_pago      VARCHAR(80) NULL,
      payment_provider     VARCHAR(40) NOT NULL DEFAULT 'mock_local',
      payment_method       VARCHAR(40) NOT NULL DEFAULT 'sandbox_local',
      payment_status       VARCHAR(40) NOT NULL DEFAULT 'approved',
      direccion_envio_json TEXT NULL,
      creado_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_orden_usuario (usuario_id),
      INDEX idx_orden_estado (estado),
      INDEX idx_orden_ref (referencia_pago),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orden_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      orden_id    INT NOT NULL,
      producto_id INT NOT NULL,
      cantidad    INT NOT NULL,
      precio      DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (orden_id) REFERENCES ordenes(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);

  const databaseName = process.env.DB_NAME || 'ecommerce_db';
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ordenes'`,
    [databaseName]
  );

  const existingColumns = new Map(rows.map((row) => [row.COLUMN_NAME, row]));

  if (existingColumns.get('usuario_id')?.IS_NULLABLE !== 'YES') {
    await pool.query('ALTER TABLE ordenes MODIFY COLUMN usuario_id INT NULL');
  }

  if (!existingColumns.has('cliente_tipo')) {
    await pool.query("ALTER TABLE ordenes ADD COLUMN cliente_tipo VARCHAR(20) NOT NULL DEFAULT 'registered' AFTER usuario_id");
  }

  if (!existingColumns.has('cliente_nombre')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN cliente_nombre VARCHAR(255) NULL AFTER cliente_tipo');
  }

  if (!existingColumns.has('cliente_email')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN cliente_email VARCHAR(255) NULL AFTER cliente_nombre');
  }

  if (!existingColumns.has('cliente_telefono')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN cliente_telefono VARCHAR(30) NULL AFTER cliente_email');
  }

  if (!existingColumns.has('subtotal')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER usuario_id');
  }

  if (!existingColumns.has('envio')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN envio DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal');
  }

  if (!existingColumns.has('moneda')) {
    await pool.query("ALTER TABLE ordenes ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'COP' AFTER total");
  }

  if (!existingColumns.has('referencia_pago')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN referencia_pago VARCHAR(80) NULL AFTER estado');
  }

  if (!existingColumns.has('payment_provider')) {
    await pool.query("ALTER TABLE ordenes ADD COLUMN payment_provider VARCHAR(40) NOT NULL DEFAULT 'mock_local' AFTER referencia_pago");
  }

  if (!existingColumns.has('payment_method')) {
    await pool.query("ALTER TABLE ordenes ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'sandbox_local' AFTER payment_provider");
  }

  if (!existingColumns.has('payment_status')) {
    await pool.query("ALTER TABLE ordenes ADD COLUMN payment_status VARCHAR(40) NOT NULL DEFAULT 'approved' AFTER payment_method");
  }

  if (!existingColumns.has('direccion_envio_json')) {
    await pool.query('ALTER TABLE ordenes ADD COLUMN direccion_envio_json TEXT NULL AFTER payment_status');
  }
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

export async function ensureAnnouncementsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS anuncios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      imagen_url VARCHAR(600) NOT NULL,
      estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
      creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_anuncios_estado (estado)
    )
  `);

  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM anuncios');
  const total = Number(rows[0]?.total || 0);

  if (total === 0) {
    const samples = [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1614179689702-355944cd0918?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1400&q=80',
    ];

    for (const url of samples) {
      await pool.query(
        "INSERT INTO anuncios (imagen_url, estado) VALUES (?, 'activo')",
        [url]
      );
    }
  }
}

export function normalizeUserRole(role) {
  return validRoles.has(role) ? role : 'user';
}
