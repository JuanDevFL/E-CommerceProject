import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fetchProductos } from './api';
import Navbar from './components/Navbar.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import { curatedProducts, normalizeRemoteProducts } from './data/curatedProducts.js';
import AboutPage from './pages/AboutPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import logoNavBar from './assets/LogoNavBar.svg';

const THEME_STORAGE_KEY = 'azami-theme';
const USER_STORAGE_KEY = 'azami-user';

function cartKeyForUser(user) {
  return user?.id ? `azami-cart-${user.id}` : null;
}

function wishlistKeyForUser(user) {
  return user?.id ? `azami-wishlist-${user.id}` : null;
}

function loadPersistedArray(key) {
  if (!key) return [];
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed?.name && parsed?.email) {
      return {
        ...parsed,
        role: parsed.role || 'user',
        token: parsed.token || '',
      };
    }
  } catch {
    // If parsing fails, fallback to a default user.
  }

  return null;
}

function getInitialCart() {
  return [];
}

function AdminRoute({ user, children }) {
  if (!user || !user.token) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [catalogNotice, setCatalogNotice] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(getInitialUser);
  const [cartItems, setCartItems] = useState(() => {
    const initial = getInitialUser();
    return loadPersistedArray(cartKeyForUser(initial));
  });
  const [wishlistIds, setWishlistIds] = useState(() => {
    const initial = getInitialUser();
    return loadPersistedArray(wishlistKeyForUser(initial));
  });
  const [cartNotice, setCartNotice] = useState(null);
  const [pageTransition, setPageTransition] = useState(false);
  const prevPathRef = useRef(location.pathname);

  const isAuthPage = location.pathname === '/auth' || location.pathname.startsWith('/reset-password');
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      window.scrollTo(0, 0);
      setPageTransition(true);
      const timer = setTimeout(() => setPageTransition(false), 600);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthPage) {
      setCatalogLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadProductos() {
      try {
        const data = await fetchProductos();
        if (!isMounted) {
          return;
        }

        const normalizedProducts = normalizeRemoteProducts(data);
        setRemoteProducts(normalizedProducts);

        if (normalizedProducts.length === 0) {
          setCatalogNotice('Mostrando la selección editorial de Azami mientras añadimos más piezas al catálogo en vivo.');
        }
      } catch {
        if (isMounted) {
          setCatalogNotice('Mostrando la selección editorial de Azami mientras el catálogo en vivo termina de conectarse.');
        }
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadProductos();

    return () => {
      isMounted = false;
    };
  }, [isAuthPage]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const key = cartKeyForUser(user);
    if (key) {
      localStorage.setItem(key, JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  useEffect(() => {
    const key = wishlistKeyForUser(user);
    if (key) {
      localStorage.setItem(key, JSON.stringify(wishlistIds));
    }
  }, [wishlistIds, user]);

  useEffect(() => {
    if (!cartNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCartNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    setUser(null);
    setCartItems([]);
    setWishlistIds([]);
    localStorage.removeItem(USER_STORAGE_KEY);
    navigate('/');
  };

  const handleAuthSuccess = (nextUser) => {
    const normalizedUser = {
      id: nextUser.id,
      name: nextUser.nombre || nextUser.name,
      email: nextUser.email,
      role: nextUser.rol || nextUser.role || 'user',
      token: nextUser.token || '',
      authSource: nextUser.authSource || 'database',
    };

    setUser(normalizedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    setCartItems(loadPersistedArray(cartKeyForUser(normalizedUser)));
    setWishlistIds(loadPersistedArray(wishlistKeyForUser(normalizedUser)));
  };

  const handleOpenAuth = () => {
    navigate('/auth');
  };

  const handleAdminProductCreated = (product) => {
    const [normalizedProduct] = normalizeRemoteProducts([product]);

    if (!normalizedProduct) {
      return;
    }

    setRemoteProducts((currentProducts) => [
      normalizedProduct,
      ...currentProducts.filter((item) => item.id !== normalizedProduct.id),
    ]);
  };

  const handleAddToCart = (product) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (product.stock === 0) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) => (
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, Math.max(product.stock, 1)) }
            : item
        ));
      }

      return [
        ...currentItems,
        {
          id: product.id,
          nombre: product.nombre,
          precio: product.precio,
          imagen_url: product.imagen_url,
          tono: product.tono,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });

    setCartNotice({
      id: `${product.id}-${Date.now()}`,
      text: `${product.nombre} se agregó al carrito correctamente.`,
    });
  };

  const handleIncrementCartItem = (productId) => {
    setCartItems((currentItems) => currentItems.map((item) => (
      item.id === productId
        ? { ...item, quantity: Math.min(item.quantity + 1, Math.max(item.stock, 1)) }
        : item
    )));
  };

  const handleDecrementCartItem = (productId) => {
    setCartItems((currentItems) => currentItems.flatMap((item) => {
      if (item.id !== productId) {
        return item;
      }

      if (item.quantity <= 1) {
        return [];
      }

      return { ...item, quantity: item.quantity - 1 };
    }));
  };

  const handleRemoveCartItem = (productId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  const handleToggleWishlist = useCallback((productId) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setWishlistIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }, [user, navigate]);

  const catalogProducts = remoteProducts.length > 0 ? remoteProducts : curatedProducts;
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((total, item) => total + (item.precio * item.quantity), 0);

  return (
    <div className="site-shell bg-background text-text">
      <div className={`page-transition-overlay ${pageTransition ? 'active' : ''}`} aria-hidden="true">
        <img src={logoNavBar} alt="" className="page-transition-logo" />
        <span className="page-transition-title">AZAMI</span>
      </div>

      <header className="site-header">
        <div className="site-header-inner">
          <Navbar
            user={user}
            theme={theme}
            cartItems={cartItems}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
            onOpenAuth={handleOpenAuth}
            onIncrementCartItem={handleIncrementCartItem}
            onDecrementCartItem={handleDecrementCartItem}
            onRemoveCartItem={handleRemoveCartItem}
          />
        </div>
      </header>

      {cartNotice && !isAuthPage && !isAdminPage && (
        <div key={cartNotice.id} className="cart-toast" aria-live="polite" aria-atomic="true">
          <p className="cart-toast-title">Carrito actualizado</p>
          <p className="cart-toast-text">{cartNotice.text}</p>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />
        <Route
          path="/catalogo"
          element={
            <CatalogPage
              catalogProducts={catalogProducts}
              catalogNotice={catalogNotice}
              catalogLoading={catalogLoading}
              wishlistIds={wishlistIds}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
            />
          }
        />
        <Route
          path="/producto/:productId"
          element={
            <ProductDetailPage
              products={catalogProducts}
              wishlistIds={wishlistIds}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
            />
          }
        />
        <Route path="/nosotros" element={<AboutPage />} />
        <Route
          path="/wishlist"
          element={
            <WishlistPage
              products={catalogProducts}
              wishlistIds={wishlistIds}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
            />
          }
        />
        <Route
          path="/auth"
          element={user ? <Navigate to={user.role === 'admin' && user.token ? '/admin' : '/'} replace /> : <AuthPage onAuthSuccess={handleAuthSuccess} />}
        />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user}>
              <AdminDashboardPage user={user} onProductCreated={handleAdminProductCreated} />
            </AdminRoute>
          }
        />
      </Routes>

      {!isAuthPage && !isAdminPage && <SiteFooter />}

      {!isAdminPage && (
        <a
          href="https://wa.me/573002454123?text=Hola%2C%20me%20interesa%20saber%20m%C3%A1s%20sobre%20los%20productos%20de%20Azami"
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-fab"
          aria-label="Chatea con nosotros por WhatsApp"
        >
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="whatsapp-fab-icon">
            <path d="M16.004 2.002C8.28 2.002 2.004 8.278 2.004 15.998c0 2.478.648 4.892 1.88 7.024L2 30l7.168-1.876A13.946 13.946 0 0 0 16.004 30c7.72 0 13.996-6.276 13.996-13.998S23.724 2.002 16.004 2.002Zm0 25.596a11.56 11.56 0 0 1-5.892-1.612l-.424-.252-4.252 1.116 1.136-4.148-.276-.44a11.52 11.52 0 0 1-1.768-6.164c0-6.392 5.2-11.592 11.596-11.592 6.392 0 11.592 5.2 11.592 11.592-.004 6.392-5.32 11.5-11.712 11.5Zm6.356-8.672c-.348-.176-2.064-1.02-2.384-1.136-.32-.116-.552-.176-.784.176-.232.348-.9 1.136-1.1 1.368-.204.232-.404.26-.752.088-.348-.176-1.468-.54-2.796-1.724-1.032-.92-1.732-2.056-1.932-2.404-.204-.348-.02-.536.152-.708.156-.156.348-.404.52-.608.176-.204.232-.348.348-.58.116-.232.06-.436-.028-.608-.088-.176-.784-1.892-1.076-2.588-.284-.68-.572-.588-.784-.6-.204-.008-.436-.012-.668-.012-.232 0-.608.088-.928.436-.32.348-1.22 1.192-1.22 2.908s1.248 3.376 1.424 3.608c.176.232 2.46 3.752 5.96 5.264.832.36 1.484.576 1.992.736.836.264 1.6.228 2.2.14.672-.1 2.064-.844 2.356-1.66.288-.816.288-1.516.204-1.66-.088-.148-.32-.232-.668-.404Z" fill="currentColor"/>
          </svg>
        </a>
      )}
    </div>
  );
}

export default App;
