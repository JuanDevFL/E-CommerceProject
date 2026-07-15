import { Link } from 'react-router-dom';

function SiteFooter({ onOpenConsentPreferences }) {
  const links = [
    { label: 'Sobre nosotros', to: '/nosotros' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Términos y condiciones', to: '/terminos' },
    { label: 'Privacidad', to: '/privacidad' },
    { label: 'Política de cookies', to: '/cookies' },
    { label: 'Ayuda', href: 'mailto:azami.oficial@gmail.com' }
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-copy">© 2026 Azami Studio</p>

        <nav className="site-footer-links" aria-label="Enlaces del pie de página">
          {links.map((link) => (
            link.to ? (
              <Link key={link.label} to={link.to} className="site-footer-link">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="site-footer-link">
                {link.label}
              </a>
            )
          ))}
          <button type="button" className="site-footer-link site-footer-button" onClick={onOpenConsentPreferences}>
            Configurar cookies
          </button>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;