# E-commerce Local Prototype

Proyecto inicial para un e-commerce con backend en Node.js + Express y frontend en React + Vite.

## Cómo usar

### Backend
1. Abrir `backend`
2. Ejecutar `npm install`
3. Copiar `backend/.env.example` a `backend/.env` y ajustar la configuración de MySQL
4. Crear la base de datos y tablas con `backend/db/schema.sql`
5. Ejecutar `npm run dev`

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
