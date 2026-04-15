# E-commerce Local Prototype

Proyecto inicial para un e-commerce con backend en Node.js + Express y frontend en React + Vite.

## Cómo usar

### Backend
1. Abrir `backend`
2. Ejecutar `npm install`
3. Copiar `backend/.env.example` a `backend/.env` y ajustar la configuración de MySQL
4. Configurar `JWT_SECRET` para las sesiones del backend
5. Crear la base de datos y tablas con `backend/db/schema.sql`
6. Ejecutar `npm run seed` para sembrar el catálogo base de Azami
7. Ejecutar `npm run seed:users` para crear las credenciales base de admin y usuario
8. Ejecutar `npm run dev`

## Modo de prueba para login

- Si quieres probar solo el inicio de sesión sin depender de MySQL, cambia `AUTH_LOGIN_MODE=mock` en `backend/.env`.
- El backend seguirá exponiendo `POST /api/usuarios/login`, pero validará las credenciales mock configuradas en el `.env`.

### Frontend
1. Abrir `frontend`
2. Ejecutar `npm install`
3. Copiar `frontend/.env.example` a `frontend/.env` si deseas cambiar la URL de la API
4. Ejecutar `npm run dev`

## Estructura
- `backend/` - servidor Express y conexión a MySQL
- `frontend/` - cliente React con Vite

## Notas
- El frontend consume la API con `VITE_API_URL`.
- En producción, puedes desplegar backend y frontend por separado.
# E-CommerceProject
