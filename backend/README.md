# Backend E-commerce

## Configuración

1. Copia `.env.example` a `.env`.
2. Ajusta los datos de MySQL: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Crea la base de datos y las tablas usando `backend/db/schema.sql`.

## Comandos

- `npm install`
- `npm run dev`

## API disponibles

- `GET /api/productos` - obtiene todos los productos
- `POST /api/productos` - crea un nuevo producto
- `POST /api/usuarios/register` - registra un usuario
- `POST /api/usuarios/login` - inicia sesión
