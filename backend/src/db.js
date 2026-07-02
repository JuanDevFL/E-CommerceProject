import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Prioriza Railway para mantener un único entorno de datos.
// Solo usa DB_* como respaldo si no existen las variables MYSQL*.
const resolvedDbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'ecommerce_db',
};

const pool = mysql.createPool({
  ...resolvedDbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export function getDbRuntimeInfo() {
  const usesRailway = Boolean(process.env.MYSQLHOST && process.env.MYSQLDATABASE);
  return {
    ...resolvedDbConfig,
    usesRailway,
  };
}

export default pool;
