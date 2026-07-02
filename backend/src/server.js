import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { isMockLoginMode } from './data/mockAuthUsers.js';
import { assertAuthSecretsAreSafe } from './auth.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import accountRoutes from './routes/accountRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { getDbRuntimeInfo } from './db.js';
import { ensureActividadLogsTable, ensureAddressesTable, ensureAnnouncementsTable, ensureOrdersTable, ensurePasswordResetTokensTable, ensureRefreshTokensTable, ensureUsuariosTable } from './userSchema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

// En producción añade el dominio del frontend (Vercel u otro) vía variable de entorno.
// Soporta múltiples dominios separados por coma, por ejemplo:
//   ALLOWED_ORIGINS=https://azami.vercel.app,https://www.azami.com
if (process.env.ALLOWED_ORIGINS) {
  for (const origin of process.env.ALLOWED_ORIGINS.split(',')) {
    const trimmed = origin.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  }
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({ message: 'E-commerce backend is running' });
});

app.use('/api/productos', productRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/anuncios', announcementRoutes);
app.use('/api/cuenta', accountRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function bootstrap() {
  try {
    assertAuthSecretsAreSafe();

    if (!isMockLoginMode()) {
      await ensureUsuariosTable();
      await ensurePasswordResetTokensTable();
      await ensureActividadLogsTable();
      await ensureRefreshTokensTable();
      await ensureOrdersTable();
      await ensureAddressesTable();
      await ensureAnnouncementsTable();
    }

    app.listen(PORT, () => {
      const dbInfo = getDbRuntimeInfo();
      const dbModeLabel = dbInfo.usesRailway
        ? 'Base de datos en PRODUCCION (Railway)'
        : 'Base de datos fuera de Railway (fallback local)';

      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`[DB] ${dbModeLabel}: ${dbInfo.database} @ ${dbInfo.host}:${dbInfo.port}`);
    });
  } catch (error) {
    console.error('No se pudo preparar la tabla de usuarios:', error.message);
    process.exit(1);
  }
}

bootstrap();
