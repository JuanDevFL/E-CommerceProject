import { useEffect, useState } from 'react';
import { fetchProductos } from './api';
import Navbar from './components/Navbar.jsx';

const THEME_STORAGE_KEY = 'azami-theme';
const USER_STORAGE_KEY = 'azami-user';

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialUser() {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) {
    const defaultUser = { name: 'Camila R.', email: 'camila@azami.com' };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed?.name && parsed?.email) {
      return parsed;
    }
  } catch {
    // If parsing fails, fallback to a default user.
  }

  return { name: 'Camila R.', email: 'camila@azami.com' };
}

function App() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(getInitialUser);

  useEffect(() => {
    async function loadProductos() {
      try {
        const data = await fetchProductos();
        setProductos(data);
      } catch (err) {
        setError('No se pudo cargar la lista de productos.');
      } finally {
        setLoading(false);
      }
    }

    loadProductos();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const handleLogin = () => {
    const nextUser = { name: 'Camila R.', email: 'camila@azami.com' };
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="w-full">
        <main>
          <section className="w-full bg-background-alt px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
            <div className="mx-auto w-full max-w-7xl">
              <Navbar
                user={user}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={handleLogout}
                onLogin={handleLogin}
              />

              <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-16">
                <p className="text-sm uppercase tracking-[0.4em] text-muted">Lujo artesanal</p>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-heading sm:text-6xl">
                  Lujo artesanal
                </h1>
                <p className="mt-5 text-xs uppercase tracking-[0.35em] text-primary/90 sm:text-base sm:tracking-[0.4em]">
                  Bolsos · Accesorios · Colección 2025
                </p>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <button type="button" className="pill-chip pill-chip-active">Crema</button>
                  <button type="button" className="pill-chip">Borgoña</button>
                  <button type="button" className="pill-chip">Marfil</button>
                  <button type="button" className="pill-chip">Negro</button>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="w-full bg-surface px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.32em] text-muted">Nueva colección</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-heading sm:text-5xl">Hecha para durar</h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                  Descubre diseños artesanales pensados para acompañarte con estilo y durabilidad.
                </p>
                <a
                  href="#productos"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-background-alt px-6 py-3 text-sm font-semibold text-surface transition hover:bg-background"
                >
                  Ver colección →
                </a>
              </div>
            </div>
          </section>

          <section id="contacto" className="w-full bg-background-alt px-4 py-10 sm:px-8 sm:py-12 lg:px-12">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-xl">
                <p className="text-sm uppercase tracking-[0.32em] text-muted">Contacto</p>
                <h2 className="mt-3 text-3xl font-semibold text-heading sm:text-4xl">Creamos piezas para tu estilo</h2>
                <p className="mt-4 text-sm text-muted sm:text-base">
                  Escríbenos para pedidos personalizados, colaboraciones o atención postventa.
                </p>
                <a
                  href="mailto:contacto@azami.com"
                  className="btn-primary mt-7 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
                >
                  contacto@azami.com
                </a>
              </div>
            </div>
          </section>

          {loading && <p className="mt-8 text-center text-muted">Cargando productos...</p>}
          {error && <p className="mt-8 text-center text-danger">{error}</p>}

          {!loading && !error && (
            <section id="productos" className="mx-auto mt-10 grid w-full max-w-7xl gap-6 px-4 pb-10 sm:grid-cols-2 sm:px-8 xl:grid-cols-3 lg:px-12">
              {productos.length === 0 ? (
                <p className="text-center text-muted">No hay productos disponibles.</p>
              ) : (
                productos.map((producto) => (
                  <article key={producto.id} className="overflow-hidden rounded-3xl bg-surface p-6 shadow-soft">
                    {producto.imagen_url && (
                      <img className="mb-6 h-52 w-full rounded-3xl object-cover" src={producto.imagen_url} alt={producto.nombre} />
                    )}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-heading">{producto.nombre}</h2>
                        <p className="mt-2 text-muted">{producto.descripcion}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-text">
                        <span className="text-xl font-bold text-primary">${producto.precio}</span>
                        <span className="rounded-full bg-surface-alt px-3 py-1 text-sm text-muted">{producto.stock} en stock</span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
