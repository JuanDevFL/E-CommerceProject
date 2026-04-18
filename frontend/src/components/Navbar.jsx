import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoNavBar from '../assets/LogoNavBar.svg';

function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function Icon({ type, className = 'nav-icon' }) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true'
  };

  switch (type) {
    case 'user':
      return (
        <svg {...commonProps}>
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...commonProps}>
          <path d="M6 9H18L17 20H7L6 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 9V7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...commonProps}>
          <path d="M12 20C11.7447 20 11.4894 19.9024 11.2941 19.7071L5.63604 14.049C3.45465 11.8677 3.45465 8.331 5.63604 6.14961C7.81743 3.96822 11.3542 3.96822 13.5355 6.14961L12 7.68513L10.4645 6.14961C8.28313 3.96822 4.74637 3.96822 2.56497 6.14961" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" transform="translate(3 1)" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 20V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.93 4.93L6.34 6.34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.66 17.66L19.07 19.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M2 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M20 12H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.93 19.07L6.34 17.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.66 6.34L19.07 4.93" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...commonProps}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...commonProps}>
          <path d="M9 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 17L20 13L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 13H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...commonProps}>
          <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'cart':
      return (
        <svg {...commonProps}>
          <path d="M4 6H6L8.2 16.2C8.29 16.65 8.63 17 9.08 17H17.55C17.98 17 18.35 16.7 18.45 16.28L20 9H7.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="20" r="1.35" fill="currentColor" />
          <circle cx="17" cy="20" r="1.35" fill="currentColor" />
        </svg>
      );
    case 'home':
      return (
        <svg {...commonProps}>
          <path d="M3 10.5L12 3L21 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9.5V19C5 19.5523 5.44772 20 6 20H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V20H18C18.5523 20 19 19.5523 19 19V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}

function Navbar({
  user,
  theme,
  cartItems,
  cartCount,
  cartSubtotal,
  onToggleTheme,
  onLogout,
  onOpenAuth,
  onIncrementCartItem,
  onDecrementCartItem,
  onRemoveCartItem,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState('');
  const isAdmin = user?.role === 'admin';
  const isAdminPage = location.pathname.startsWith('/admin');

  const closeMenu = () => {
    setIsOpen(false);
    setActiveSubmenu('');
  };

  const closeUserPanel = () => setIsUserPanelOpen(false);
  const closeCart = () => setIsCartOpen(false);

  const handleDesktopPanelMouseLeave = (closeHandler) => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      closeHandler();
    }
  };

  const menuItems = [
    {
      label: 'Colecciones',
      subOptions: [
        { label: 'Bolsos premium', route: '/catalogo' },
        { label: 'Accesorios', route: '/catalogo' },
        { label: 'Edicion 2025', route: '/catalogo' }
      ]
    },
    {
      label: 'Nosotros',
      subOptions: [
        { label: 'Nuestra historia', route: '/nosotros' },
        { label: 'Materiales', route: '/nosotros' },
        { label: 'Proceso artesanal', route: '/nosotros' }
      ]
    },
    {
      label: 'Contacto',
      subOptions: [
        { label: 'Atencion directa', route: '/nosotros' },
        { label: 'Pedidos especiales', route: '/nosotros' },
        { label: 'Postventa', route: '/nosotros' }
      ]
    }
  ];

  return (
    <nav className="navbar relative flex w-full items-center py-3">
      <div className="navbar-brand min-w-0 flex items-center gap-2 sm:gap-3">
        <img src={logoNavBar} alt="Logo Azami" className="brand-logo" />
        <span className="text-xl font-semibold uppercase tracking-[0.28em] text-primary sm:text-2xl">AZAMI</span>
      </div>

      <div className="navbar-center-actions hidden lg:flex items-center gap-2">
        <div className="navbar-menu-anchor">
          <button
            type="button"
            className="nav-icon-btn"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
            onClick={() => {
              setIsOpen((prev) => !prev);
              setIsUserPanelOpen(false);
              setIsCartOpen(false);
            }}
          >
            <Icon type="menu" />
            <span className="nav-icon-tooltip">Menú</span>
          </button>

          <div
            className={`fixed inset-0 z-50 navbar-panel fullscreen-menu-panel transition-all duration-300 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 -translate-y-2'}`}
            aria-hidden={!isOpen}
            onMouseLeave={() => handleDesktopPanelMouseLeave(closeMenu)}
          >
            <div className="fullscreen-panel-header">
              <span className="text-lg font-semibold tracking-[0.24em] text-primary uppercase">Menu</span>
              <button type="button" className="btn-icon panel-close-button px-4 py-2 text-xs font-semibold" onClick={closeMenu}>Cerrar</button>
            </div>

            <ul className="fullscreen-menu-list">
              {menuItems.map((item) => (
                <li
                  key={item.label}
                  className={`menu-item-group ${activeSubmenu === item.label ? 'is-open' : ''}`}
                  onMouseEnter={() => setActiveSubmenu(item.label)}
                  onMouseLeave={() => setActiveSubmenu('')}
                >
                  <button
                    type="button"
                    className="menu-main-btn"
                    onClick={() => setActiveSubmenu((prev) => (prev === item.label ? '' : item.label))}
                  >
                    <span className="menu-main-label">{item.label}</span>
                    <span className="menu-main-plus">+</span>
                  </button>

                  <ul className="submenu-list">
                    {item.subOptions.map((sub) => (
                      <li key={sub.label}>
                        {sub.route ? (
                          <button
                            type="button"
                            className="submenu-link"
                            onClick={() => { closeMenu(); navigate(sub.route); }}
                          >
                            {sub.label}
                          </button>
                        ) : (
                          <a href={sub.href} className="submenu-link" onClick={closeMenu}>
                            {sub.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          className="nav-icon-btn"
          style={{ display: isAdminPage ? 'none' : undefined }}
          aria-label="Carrito"
          onClick={() => {
            setIsCartOpen((prev) => !prev);
            closeMenu();
            closeUserPanel();
          }}
        >
          <span className="cart-button-icon-wrap">
            <Icon type="cart" />
            {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
          </span>
          <span className="nav-icon-tooltip">Carrito</span>
        </button>

        {user ? (
          <button
            type="button"
            className="nav-icon-btn"
            aria-label={user.name}
            onClick={() => {
              setIsUserPanelOpen(true);
              closeMenu();
              closeCart();
            }}
          >
            <Icon type="user" />
            <span className="nav-icon-tooltip">{user.name}</span>
          </button>
        ) : (
          <button type="button" className="nav-icon-btn" aria-label="Iniciar sesión" onClick={onOpenAuth}>
            <Icon type="user" />
            <span className="nav-icon-tooltip">Iniciar sesión</span>
          </button>
        )}

        <button
          type="button"
          className="nav-icon-btn"
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          onClick={onToggleTheme}
        >
          <Icon type={theme === 'dark' ? 'sun' : 'moon'} />
          <span className="nav-icon-tooltip">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>

        {isAdmin && !isAdminPage && (
          <button
            type="button"
            className="nav-icon-btn"
            aria-label="Dashboard"
            onClick={() => {
              closeMenu();
              closeUserPanel();
              closeCart();
              navigate('/admin');
            }}
          >
            <Icon type="dashboard" />
            <span className="nav-icon-tooltip">Dashboard</span>
          </button>
        )}

        {isAdmin && isAdminPage && (
          <button
            type="button"
            className="nav-icon-btn"
            aria-label="Volver a tienda"
            onClick={() => {
              closeMenu();
              closeUserPanel();
              closeCart();
              navigate('/');
            }}
          >
            <Icon type="home" />
            <span className="nav-icon-tooltip">Volver a tienda</span>
          </button>
        )}

        {!isAdmin && (
          <button
            type="button"
            className="nav-icon-btn"
            aria-label="Inicio"
            onClick={() => {
              closeMenu();
              closeUserPanel();
              closeCart();
              navigate('/');
            }}
          >
            <Icon type="home" />
            <span className="nav-icon-tooltip">Inicio</span>
          </button>
        )}
      </div>

      <div className="navbar-mobile-actions flex min-w-0 shrink-0 items-center gap-1.5 lg:hidden">
        {!isAdminPage && (
          <button
            type="button"
            className="nav-icon-btn nav-icon-btn-sm"
            onClick={() => {
              setIsCartOpen((prev) => !prev);
              closeMenu();
              closeUserPanel();
            }}
            aria-label="Carrito"
          >
            <span className="cart-button-icon-wrap">
              <Icon type="cart" className="nav-icon nav-icon-sm" />
              {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
            </span>
          </button>
        )}

        {user ? (
          <button
            type="button"
            className="nav-icon-btn nav-icon-btn-sm"
            onClick={() => {
              setIsUserPanelOpen(true);
              closeMenu();
              closeCart();
            }}
            aria-label={user.name}
          >
            <Icon type="user" className="nav-icon nav-icon-sm" />
          </button>
        ) : (
          <button type="button" className="nav-icon-btn nav-icon-btn-sm" onClick={onOpenAuth} aria-label="Iniciar sesión">
            <Icon type="user" className="nav-icon nav-icon-sm" />
          </button>
        )}

        <button
          type="button"
          className="nav-icon-btn nav-icon-btn-sm"
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          onClick={onToggleTheme}
        >
          <Icon type={theme === 'dark' ? 'sun' : 'moon'} className="nav-icon nav-icon-sm" />
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-icon-btn-sm btn-menu-horizontal"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setIsUserPanelOpen(false);
            setIsCartOpen(false);
          }}
        >
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[62] cart-panel transition-all duration-300 ${isCartOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}
        aria-hidden={!isCartOpen}
        onMouseLeave={() => handleDesktopPanelMouseLeave(closeCart)}
      >
        <div className="fullscreen-panel-header">
          <span className="text-lg font-semibold tracking-[0.22em] text-primary uppercase">Carrito</span>
          <button type="button" className="btn-icon panel-close-button px-4 py-2 text-xs font-semibold" onClick={closeCart}>Cerrar</button>
        </div>

        {cartItems.length > 0 ? (
          <div className="cart-panel-content">
            <ul className="cart-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item">
                  <img src={item.imagen_url} alt={item.nombre} className="cart-item-image" loading="lazy" decoding="async" referrerPolicy="no-referrer" />

                  <div className="cart-item-copy">
                    <div className="cart-item-heading">
                      <h3>{item.nombre}</h3>
                      <button type="button" className="cart-remove-button" onClick={() => onRemoveCartItem(item.id)}>
                        Quitar
                      </button>
                    </div>
                    <p>{item.tono}</p>
                    <span className="cart-item-price">{formatPrice(item.precio)}</span>

                    <div className="cart-quantity-controls">
                      <button type="button" className="cart-quantity-button" onClick={() => onDecrementCartItem(item.id)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="cart-quantity-button"
                        onClick={() => onIncrementCartItem(item.id)}
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-summary-card">
              <div className="cart-summary-row">
                <span>Productos</span>
                <strong>{cartCount}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(cartSubtotal)}</strong>
              </div>
              <button
                type="button"
                className="btn-primary rounded-full px-6 py-3 text-sm font-semibold"
                onClick={() => {
                  closeCart();
                  if (!user) {
                    onOpenAuth();
                  }
                }}
              >
                {user ? 'Continuar compra' : 'Inicia sesión para continuar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="cart-empty-state">
            <h2>Tu carrito está vacío.</h2>
            <p>Agrega piezas desde el catálogo para empezar a preparar tu compra.</p>
            <button type="button" className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold" onClick={closeCart}>
              Seguir explorando
            </button>
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-[60] user-panel transition-all duration-300 ${isUserPanelOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}
        aria-hidden={!isUserPanelOpen}
        onMouseLeave={() => handleDesktopPanelMouseLeave(closeUserPanel)}
      >
        <div className="fullscreen-panel-header">
          <span className="text-lg font-semibold tracking-[0.22em] text-primary uppercase">Tu cuenta</span>
          <button type="button" className="btn-icon panel-close-button px-4 py-2 text-xs font-semibold" onClick={closeUserPanel}>Cerrar</button>
        </div>

        {user ? (
          <div className="user-panel-content">
            <div className="user-panel-heading">
              <h2 className="text-3xl font-semibold text-heading">{user.name}</h2>
              <p className="mt-2 text-sm text-muted">{user.email}</p>
            </div>

            <div className="user-panel-actions">
              {isAdmin && !isAdminPage && (
                <button
                  type="button"
                  className="panel-action-link panel-action-button"
                  onClick={() => {
                    closeUserPanel();
                    navigate('/admin');
                  }}
                >
                  <Icon type="menu" />
                  Dashboard admin
                </button>
              )}
              {isAdmin && isAdminPage && (
                <button
                  type="button"
                  className="panel-action-link panel-action-button"
                  onClick={() => {
                    closeUserPanel();
                    navigate('/');
                  }}
                >
                  <Icon type="bag" />
                  Volver a tienda
                </button>
              )}
              {!isAdmin && (
                <>
                  <a href="#productos" className="panel-action-link" onClick={closeUserPanel}><Icon type="bag" /> Mis compras</a>
                  <a href="#productos" className="panel-action-link" onClick={closeUserPanel}><Icon type="heart" /> Lista de deseos</a>
                </>
              )}
              <button
                type="button"
                className="panel-action-link panel-action-button panel-action-danger"
                onClick={() => {
                  onLogout();
                  closeUserPanel();
                }}
              >
                <Icon type="logout" />
                Cerrar sesion
              </button>
            </div>
          </div>
        ) : (
          <div className="user-panel-content">
            <div className="user-panel-heading">
              <h2 className="text-3xl font-semibold text-heading">Sin sesion iniciada</h2>
              <p className="mt-2 text-sm text-muted">Inicia sesion para ver tus compras y tu lista de deseos.</p>
            </div>
            <div className="user-panel-actions">
              <button
                type="button"
                className="panel-action-link panel-action-button"
                onClick={() => {
                  onOpenAuth();
                  closeUserPanel();
                }}
              >
                Iniciar sesion
              </button>
            </div>
          </div>
        )}
      </div>

      {isOpen && <div className="screen-overlay fixed inset-0 z-40 lg:hidden" onClick={closeMenu} aria-hidden="true" />}
      {isCartOpen && <div className="screen-overlay fixed inset-0 z-[61] lg:hidden" onClick={closeCart} aria-hidden="true" />}
      {(isUserPanelOpen || isCartOpen) && <div className="fixed inset-0 z-50 hidden lg:block" onClick={() => { closeUserPanel(); closeCart(); }} aria-hidden="true" />}
    </nav>
  );
}

export default Navbar;
