import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { isMockLoginMode } from './data/mockAuthUsers.js';
import { requestLogger } from './middleware/requestLogger.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { ensureUsuariosTable } from './userSchema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({ message: 'E-commerce backend is running' });
});

app.use('/api/productos', productRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function bootstrap() {
  try {
    if (!isMockLoginMode()) {
      await ensureUsuariosTable();
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo preparar la tabla de usuarios:', error.message);
    process.exit(1);
  }
}

bootstrap();
