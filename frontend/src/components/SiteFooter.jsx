import { Link } from 'react-router-dom';

function SocialIcon({ type }) {
  const commonProps = {
    className: 'footer-social-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true'
  };

  switch (type) {
    case 'instagram':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...commonProps}>
          <path d="M14 8H16V4.8C15.65 4.75 14.44 4.65 13.03 4.65C10.08 4.65 8.06 6.45 8.06 9.75V12.5H5V16.1H8.06V21H11.8V16.1H14.73L15.2 12.5H11.8V10.1C11.8 9.06 12.09 8.35 13.57 8.35H15.33V8H14Z" fill="currentColor" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...commonProps}>
          <path d="M21 12.2C21 14.2 20.8 15.9 20.55 16.74C20.31 17.52 19.7 18.13 18.92 18.37C18.08 18.62 15.98 18.8 12 18.8C8.02 18.8 5.92 18.62 5.08 18.37C4.3 18.13 3.69 17.52 3.45 16.74C3.2 15.9 3 14.2 3 12.2C3 10.2 3.2 8.5 3.45 7.66C3.69 6.88 4.3 6.27 5.08 6.03C5.92 5.78 8.02 5.6 12 5.6C15.98 5.6 18.08 5.78 18.92 6.03C19.7 6.27 20.31 6.88 20.55 7.66C20.8 8.5 21 10.2 21 12.2Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 9.55L15.2 12.2L10 14.85V9.55Z" fill="currentColor" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...commonProps}>
          <path d="M14.75 4C15 5.8 16.3 7.1 18 7.35V10C16.75 9.95 15.54 9.57 14.5 8.92V14.45C14.5 17.08 12.38 19.2 9.75 19.2C7.12 19.2 5 17.08 5 14.45C5 11.82 7.12 9.7 9.75 9.7C10.15 9.7 10.54 9.75 10.9 9.87V12.45C10.56 12.24 10.16 12.12 9.75 12.12C8.45 12.12 7.42 13.15 7.42 14.45C7.42 15.75 8.45 16.78 9.75 16.78C11.05 16.78 12.08 15.75 12.08 14.45V4H14.75Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

function SiteFooter({ onOpenConsentPreferences }) {
  const links = [
    { label: 'Sobre nosotros', to: '/nosotros' },
    { label: 'Catálogo', to: '/catalogo' },
    { label: 'Términos y condiciones', to: '/terminos' },
    { label: 'Privacidad', to: '/privacidad' },
    { label: 'Política de cookies', to: '/cookies' },
    { label: 'Ayuda', href: 'mailto:contacto@azami.com' }
  ];

  const socialLinks = [
    { label: 'Instagram', href: 'https://www.instagram.com/', icon: 'instagram' },
    { label: 'Facebook', href: 'https://www.facebook.com/', icon: 'facebook' },
    { label: 'YouTube', href: 'https://www.youtube.com/', icon: 'youtube' },
    { label: 'TikTok', href: 'https://www.tiktok.com/', icon: 'tiktok' }
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

        <div className="site-footer-social" aria-label="Redes sociales de Azami">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="site-footer-social-link"
              aria-label={link.label}
              target="_blank"
              rel="noreferrer"
            >
              <SocialIcon type={link.icon} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;