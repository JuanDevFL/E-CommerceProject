# Guía de despliegue — Azami Studio

Stack recomendado:
- **Frontend** → Vercel (gratis, CDN global)
- **Backend** → Railway (Node.js)
- **Base de datos** → Railway MySQL (mismo proyecto)
- **Dominio** → Namecheap / Porkbun (~$10/año, opcional)

---

## 1. Preparar el repositorio en GitHub

Si el repositorio aún no está en GitHub:

```bash
git init
git remote add origin https://github.com/JuanDevFL/E-CommerceProject.git
git add .
git commit -m "feat: production-ready config"
git push -u origin main
```

Asegúrate de que **`.env`** (backend y frontend) estén en `.gitignore`. Solo se suben los `.env.example`.

---

## 2. Desplegar el backend en Railway

### 2.1 Crear cuenta y proyecto

1. Ir a [railway.app](https://railway.app) → **Start a new project**
2. Elegir **Deploy from GitHub repo** → seleccionar `E-CommerceProject`
3. Cuando pregunte el directorio raíz, escribir `backend`

### 2.2 Añadir la base de datos MySQL

1. Dentro del proyecto Railway → **+ New** → **Database** → **MySQL**
2. Railway crea el servicio y expone las variables:
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

### 2.3 Mapear las variables de entorno del backend

En el servicio Node.js → pestaña **Variables**, añadir:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Railway lo sobreescribe automáticamente con su propio $PORT) |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` (referencia Railway) |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `JWT_SECRET` | (genera con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `JWT_REFRESH_SECRET` | (otro valor aleatorio, distinto al anterior) |
| `ALLOWED_ORIGINS` | *(déjalo vacío por ahora; lo completas en el paso 4)* |
| `AUTH_LOGIN_MODE` | `database` |

> **Nota sobre PORT**: Railway inyecta `$PORT` automáticamente. El backend ya lo lee con `process.env.PORT || 5000`, así que no hay que cambiar código.

### 2.4 Copiar la URL pública del backend

Una vez desplegado, Railway te da una URL del estilo:
`https://azami-backend-production.up.railway.app`

Guárdala; la necesitas en los pasos siguientes.

---

## 3. Desplegar el frontend en Vercel

### 3.1 Crear cuenta y proyecto

1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Importar el mismo repositorio GitHub
3. Cuando pida configuración:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` *(ya está configurado)*
   - **Output Directory**: `dist`

### 3.2 Variables de entorno en Vercel

En **Settings → Environment Variables**, añadir:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://azami-backend-production.up.railway.app/api` |
| `VITE_WOMPI_PUBLIC_KEY` | Tu llave pública de Wompi sandbox o producción |
| `VITE_WOMPI_CURRENCY` | `COP` |
| `VITE_WOMPI_SIGNATURE_INTEGRITY` | Tu firma de integridad Wompi (vacío en sandbox) |
| `VITE_WOMPI_REDIRECT_URL` | `https://tu-proyecto.vercel.app/mi-cuenta` |
| `VITE_WHATSAPP_SALES_NUMBER` | Tu número (ej: `573001234567`) |

### 3.3 Copiar la URL del frontend

Vercel te da algo como: `https://azami-studio.vercel.app`

---

## 4. Conectar frontend ↔ backend (CORS)

Volver al servicio Node.js en Railway → **Variables**:

| Variable | Valor |
|---|---|
| `ALLOWED_ORIGINS` | `https://azami-studio.vercel.app` |

Si tienes dominio propio (por ejemplo `https://www.azamistudio.com`), agrégalo separado por coma:
`https://azami-studio.vercel.app,https://www.azamistudio.com`

Railway hace redeploy automático al guardar la variable.

---

## 5. Sembrar la base de datos (seed inicial)

El backend ya ejecuta las migraciones (`CREATE TABLE IF NOT EXISTS`) al arrancar, así que las tablas se crean solas.

Para cargar productos y usuario admin iniciales, conéctate a la DB de Railway con cualquier cliente MySQL (TablePlus, DBeaver, etc.) usando las credenciales del plugin, o usa los scripts de seed:

```bash
cd backend
# Copiar .env.example → .env y poner las credenciales de Railway
npm run seed:products   # si tienes el script
```

O ejecuta el SQL de `db/schema.sql` directamente en el panel MySQL de Railway.

---

## 6. Dominio personalizado (opcional)

### En Vercel (frontend)
Settings → **Domains** → añadir `azamistudio.com` o `www.azamistudio.com`  
Vercel te da los registros DNS (CNAME / A) que debes configurar en tu registrador.

### En Railway (backend)
Settings → **Networking** → **Custom Domain** → añadir `api.azamistudio.com`  
Railway también te da el CNAME para configurar.

Con dominio propio para el backend:
- `VITE_API_URL` → `https://api.azamistudio.com/api`
- `ALLOWED_ORIGINS` → `https://azamistudio.com,https://www.azamistudio.com`

---

## 7. Obtener llaves de Wompi

1. Ir a [sandbox.wompi.co](https://sandbox.wompi.co) → Crear cuenta gratuita
2. Configuración → Llaves de API → copiar **Llave pública de prueba**
3. Pegar en `VITE_WOMPI_PUBLIC_KEY` (Vercel)
4. Para producción real: [comercios.wompi.co](https://comercios.wompi.co) (requiere aprobación del comercio)

---

## 8. Checklist final antes de ir live

- [ ] `NODE_ENV=production` en Railway
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` con valores aleatorios seguros (mínimo 64 bytes)
- [ ] `ALLOWED_ORIGINS` apunta exactamente al dominio de Vercel (sin `/` al final)
- [ ] `VITE_API_URL` termina en `/api`
- [ ] `VITE_WOMPI_PUBLIC_KEY` configurada
- [ ] `VITE_WHATSAPP_SALES_NUMBER` con tu número real
- [ ] El backend responde en `https://tu-backend.up.railway.app/` con `{"message":"E-commerce backend is running"}`
- [ ] Probar login, refresh de token y checkout en la URL de Vercel

---

## Costos estimados

| Servicio | Plan | Costo |
|---|---|---|
| Vercel | Hobby | **Gratis** |
| Railway (Node.js + MySQL) | Hobby | **$5 USD/mes** |
| Dominio .com | Namecheap / Porkbun | **~$10 USD/año** |
| **Total** | | **~$5-6 USD/mes** |
