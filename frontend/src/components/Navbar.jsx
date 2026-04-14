import { useState } from 'react';

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
    default:
      return null;
  }
}

function Navbar({ user, theme, onToggleTheme, onLogout, onLogin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState('');

  const closeMenu = () => {
    setIsOpen(false);
    setActiveSubmenu('');
  };

  const closeUserPanel = () => setIsUserPanelOpen(false);

  const menuItems = [
    {
      label: 'Colecciones',
      subOptions: [
        { label: 'Bolsos premium', href: '#productos' },
        { label: 'Accesorios', href: '#productos' },
        { label: 'Edicion 2025', href: '#productos' }
      ]
    },
    {
      label: 'Nosotros',
      subOptions: [
        { label: 'Nuestra historia', href: '#about' },
        { label: 'Materiales', href: '#about' },
        { label: 'Proceso artesanal', href: '#about' }
      ]
    },
    {
      label: 'Contacto',
      subOptions: [
        { label: 'Atencion directa', href: '#contacto' },
        { label: 'Pedidos especiales', href: '#contacto' },
        { label: 'Postventa', href: '#contacto' }
      ]
    }
  ];

  return (
    <nav className="relative flex items-center justify-between gap-4 py-5 navbar sm:py-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-2xl font-semibold tracking-[0.32em] text-primary uppercase">AZAMI</span>
      </div>

      <div className="hidden items-center gap-3 lg:flex navbar-desktop-actions">
        <button
          type="button"
          className="btn-icon btn-menu-trigger rounded-full px-4 py-2.5 text-sm font-semibold"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setIsUserPanelOpen(false);
          }}
        >
          <Icon type="menu" />
          Menu
        </button>

        {user ? (
          <button
            type="button"
            className="btn-user rounded-full px-5 py-2.5 text-sm font-semibold"
            onClick={() => {
              setIsUserPanelOpen(true);
              closeMenu();
            }}
          >
            <Icon type="user" />
            {user.name}
          </button>
        ) : (
          <button type="button" className="btn-user rounded-full px-5 py-2.5 text-sm font-semibold" onClick={onLogin}>
            <Icon type="user" />
            Iniciar sesion
          </button>
        )}

        <button type="button" className="btn-nav-action rounded-full px-6 py-3 text-sm font-semibold">
          Explorar
        </button>
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        {user && (
          <button
            type="button"
            className="btn-user rounded-full px-3 py-2 text-xs font-semibold"
            onClick={() => {
              setIsUserPanelOpen(true);
              closeMenu();
            }}
          >
            <Icon type="user" className="nav-icon nav-icon-sm" />
            {user.name}
          </button>
        )}
        <button
          type="button"
          className="btn-icon btn-menu-horizontal"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
          <span className={`menu-line ${isOpen ? 'open' : ''}`} />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 navbar-panel fullscreen-menu-panel transition-all duration-300 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 -translate-y-2'}`}
        aria-hidden={!isOpen}
      >
        <div className="fullscreen-panel-header">
          <span className="text-lg font-semibold tracking-[0.24em] text-primary uppercase">Menu</span>
          <button type="button" className="btn-icon px-4 py-2 text-xs font-semibold" onClick={closeMenu}>Cerrar</button>
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
                    <a href={sub.href} className="submenu-link" onClick={closeMenu}>
                      {sub.label}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`fixed inset-0 z-[60] user-panel transition-all duration-300 ${isUserPanelOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}
        aria-hidden={!isUserPanelOpen}
      >
        <div className="fullscreen-panel-header">
          <span className="text-lg font-semibold tracking-[0.22em] text-primary uppercase">Tu cuenta</span>
          <button type="button" className="btn-icon px-4 py-2 text-xs font-semibold" onClick={closeUserPanel}>Cerrar</button>
        </div>

        {user ? (
          <div className="user-panel-content">
            <div className="user-panel-heading">
              <h2 className="text-3xl font-semibold text-heading">{user.name}</h2>
              <p className="mt-2 text-sm text-muted">{user.email}</p>
            </div>

            <div className="user-panel-actions">
              <a href="#productos" className="panel-action-link" onClick={closeUserPanel}><Icon type="bag" /> Mis compras</a>
              <a href="#productos" className="panel-action-link" onClick={closeUserPanel}><Icon type="heart" /> Lista de deseos</a>
              <button type="button" className="panel-action-link panel-action-button" onClick={onToggleTheme}>
                <Icon type="sun" />
                Cambiar a {theme === 'dark' ? 'modo claro' : 'modo oscuro'}
              </button>
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
                  onLogin();
                  closeUserPanel();
                }}
              >
                Iniciar sesion
              </button>
            </div>
          </div>
        )}
      </div>

      {isOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={closeMenu} aria-hidden="true" />}
      {isUserPanelOpen && <div className="fixed inset-0 z-50 hidden lg:block" onClick={closeUserPanel} aria-hidden="true" />}
    </nav>
  );
}

export default Navbar;
