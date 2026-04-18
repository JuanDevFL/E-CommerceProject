import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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

const THEME_STORAGE_KEY = 'azami-theme';
const USER_STORAGE_KEY = 'azami-user';
const WISHLIST_STORAGE_KEY = 'azami-wishlist';

function cartKeyForUser(user) {
  return user?.id ? `azami-cart-${user.id}` : null;
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
    return loadPersistedArray(WISHLIST_STORAGE_KEY);
  });
  const [cartNotice, setCartNotice] = useState(null);

  const isAuthPage = location.pathname === '/auth' || location.pathname.startsWith('/reset-password');
  const isAdminPage = location.pathname.startsWith('/admin');

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
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

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
    </div>
  );
}

export default App;
