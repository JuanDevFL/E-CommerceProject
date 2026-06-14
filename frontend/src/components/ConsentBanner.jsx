import { useState } from 'react';

function ConsentBanner({ onSave }) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const updatePreference = (key) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label="Configuración de cookies y privacidad">
      <div className="consent-banner-copy">
        <p className="consent-kicker">Privacidad y protección de datos</p>
        <h2>Autorización de tratamiento de datos personales</h2>
        <p>
          Usamos cookies necesarias para la operación del sitio y, solo con tu autorización,
          cookies de analítica o mercadeo. Puedes aceptar, rechazar las no esenciales o personalizar tu decisión.
        </p>
      </div>

      {isCustomizing && (
        <div className="consent-preferences">
          <label className="consent-option is-locked">
            <input type="checkbox" checked disabled />
            <span>
              <strong>Necesarias</strong>
              <small>Requeridas para seguridad, sesión y funcionamiento del carrito.</small>
            </span>
          </label>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={() => updatePreference('analytics')}
            />
            <span>
              <strong>Analítica</strong>
              <small>Medición de uso para mejorar experiencia y rendimiento.</small>
            </span>
          </label>

          <label className="consent-option">
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={() => updatePreference('marketing')}
            />
            <span>
              <strong>Mercadeo</strong>
              <small>Personalización de contenidos y comunicaciones promocionales.</small>
            </span>
          </label>
        </div>
      )}

      <div className="consent-actions">
        {!isCustomizing && (
          <button type="button" className="btn-secondary consent-btn" onClick={() => setIsCustomizing(true)}>
            Personalizar
          </button>
        )}
        <button
          type="button"
          className="btn-secondary consent-btn"
          onClick={() => onSave({ necessary: true, analytics: false, marketing: false }, 'essential_only')}
        >
          Solo necesarias
        </button>
        <button
          type="button"
          className="btn-primary consent-btn"
          onClick={() => onSave(isCustomizing ? preferences : { necessary: true, analytics: true, marketing: true }, isCustomizing ? 'custom' : 'accept_all')}
        >
          {isCustomizing ? 'Guardar preferencias' : 'Aceptar todo'}
        </button>
      </div>
    </div>
  );
}

export default ConsentBanner;
