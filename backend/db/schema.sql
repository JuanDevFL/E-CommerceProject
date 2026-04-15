CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  imagen_url VARCHAR(500),
  stock INT DEFAULT 0,
  categoria VARCHAR(120) DEFAULT 'Colección Azami',
  tono VARCHAR(120) DEFAULT 'Crema',
  material VARCHAR(120) DEFAULT 'Cuero premium',
  etiqueta VARCHAR(120) DEFAULT 'Online',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
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
