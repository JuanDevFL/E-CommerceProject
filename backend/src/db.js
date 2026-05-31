import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Railway MySQL plugin expone MYSQLHOST/MYSQLUSER/etc.
// Se aceptan ambos prefijos para funcionar local y en Railway sin tocar variables.
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
