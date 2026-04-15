# Backend E-commerce

## Configuración

1. Copia `.env.example` a `.env`.
2. Ajusta los datos de MySQL: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Define `JWT_SECRET` para firmar la sesión de usuarios y admins.
4. Crea la base de datos y las tablas usando `backend/db/schema.sql`.
5. Ejecuta `npm run seed` para poblar el catálogo inicial de Azami.
6. Ejecuta `npm run seed:users` para crear o actualizar un admin y un usuario base con roles.

## Comandos

- `npm install`
- `npm run dev`
- `npm run seed`
- `npm run seed:users`

## API disponibles

- `GET /api/productos` - obtiene todos los productos
- `POST /api/productos` - crea un nuevo producto
- `POST /api/usuarios/register` - registra un usuario
- `POST /api/usuarios/login` - inicia sesión
- `GET /api/admin/dashboard` - resumen administrativo protegido
- `PATCH /api/admin/users/:userId/role` - cambia el rol de un usuario

## Roles y credenciales base

- El registro público crea cuentas con rol `user`.
- El login y el registro devuelven `rol` y `token` para la sesión.
- `npm run seed:users` usa estas variables del `.env`: `SEED_ADMIN_*` y `SEED_USER_*`.
- Solo un `admin` autenticado puede crear productos o consultar el dashboard de administración.

## Login de prueba sin MySQL

- Si defines `AUTH_LOGIN_MODE=mock`, el endpoint `POST /api/usuarios/login` deja de consultar MySQL y usa credenciales de prueba configuradas en el `.env`.
- Credenciales mock por defecto: `admin.test@azami.com / AdminTest2026!` y `cliente.test@azami.com / ClienteTest2026!`.
- En ese modo, el login sigue siendo por API, pero la validación sale de `src/data/mockAuthUsers.js` en lugar de una query SQL.
- En `mock`, el servidor ya no intenta preparar la tabla `usuarios` al arrancar, así que puedes probar el login aunque MySQL no esté disponible.

## Logging de solicitudes API

- El backend ahora imprime en terminal cada request hacia `/api/*` y su respuesta asociada.
- Se muestran `method`, `path`, `query`, `body` y algunos headers útiles; `password`, `authorization` y `token` se redactan automáticamente.
- Puedes apagarlo con `LOG_API_REQUESTS=false` en `backend/.env`.
- Si necesitas depurar exactamente lo que llega al login, activa `LOG_AUTH_PAYLOAD=true` y el backend imprimirá el JSON real recibido por `POST /api/usuarios/login`, incluyendo `email` y `password` sin redacción.
