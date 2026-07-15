CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

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
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  imagen_url VARCHAR(500),
  image_urls TEXT,
  stock INT DEFAULT 0,
  categoria VARCHAR(120) DEFAULT 'Colección Azami',
  tono VARCHAR(120) DEFAULT 'Crema',
  color_variants_json LONGTEXT,
  material VARCHAR(120) DEFAULT 'Cuero premium',
  etiqueta VARCHAR(120) DEFAULT 'Online',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expira_at TIMESTAMP NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  envio DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento_regla_id INT NULL,
  descuento_detalle_json TEXT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  tipo ENUM('new_user', 'quantity') NOT NULL,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_quantity INT NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL,
  max_uses_per_user INT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad INT NOT NULL DEFAULT 100,
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orden_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);
