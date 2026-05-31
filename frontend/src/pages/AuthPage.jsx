import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, loginUsuario, registerUsuario } from '../api.js';

const initialState = {
  nombre: '',
  email: '',
  password: '',
  acceptTerms: false,
  acceptDataPolicy: false,
  acceptMarketing: false,
};

function AuthPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccessMessage('');
    setFormState(initialState);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (mode === 'forgot') {
        const result = await forgotPassword({ email: formState.email });
        setSuccessMessage(result.message);
        return;
      }

      const payload = mode === 'register'
        ? (() => {
            if (!formState.acceptTerms || !formState.acceptDataPolicy) {
              throw new Error('Debes aceptar Términos y autorizar el tratamiento de datos para crear tu cuenta.');
            }

            return registerUsuario({
              nombre: formState.nombre,
              email: formState.email,
              password: formState.password,
              acceptTerms: formState.acceptTerms,
              acceptDataPolicy: formState.acceptDataPolicy,
              acceptMarketing: formState.acceptMarketing,
              consentVersion: '2026-05-07',
            });
          })()
        : await loginUsuario({
            email: formState.email,
            password: formState.password,
          });

      onAuthSuccess(payload);
      navigate(payload.rol === 'admin' ? '/admin' : '/');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo completar la autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-hero-panel">
          <p className="auth-eyebrow">Acceso Azami</p>
          <h1 className="auth-title">Ingresa o crea tu cuenta para guardar favoritos y preparar tu compra.</h1>
          <p className="auth-description">
            Centralizamos el acceso en una sola pantalla para registro e inicio de sesión,
            con una experiencia limpia y consistente con el resto del storefront.
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit-card">
              <span className="auth-benefit-kicker">Perfil</span>
              <p>Guarda tu sesión, consulta tus piezas y prepara el checkout desde el carrito.</p>
            </div>
            <div className="auth-benefit-card">
              <span className="auth-benefit-kicker">Colección</span>
              <p>Accede a lanzamientos, favoritos y recomendaciones basadas en tu selección.</p>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-mode-switch" role="tablist" aria-label="Seleccionar formulario de autenticación">
            <button
              type="button"
              className={`auth-mode-button ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`auth-mode-button ${mode === 'register' ? 'is-active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Registrarse
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2>
                {mode === 'forgot'
                  ? 'Recuperar contraseña'
                  : mode === 'login'
                    ? 'Bienvenida de vuelta'
                    : 'Crear cuenta Azami'}
              </h2>
              <p>
                {mode === 'forgot'
                  ? 'Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.'
                  : mode === 'login'
                    ? 'Accede con tu correo y contraseña para continuar con tu selección.'
                    : 'Registra tu cuenta para guardar piezas y usar el carrito entre sesiones.'}
              </p>
            </div>

            {mode === 'register' && (
              <label className="auth-field">
                <span>Nombre</span>
                <input
                  type="text"
                  name="nombre"
                  value={formState.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                required
              />
            </label>

            {mode !== 'forgot' && (
              <label className="auth-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </label>
            )}

            {mode === 'login' && (
              <button type="button" className="auth-forgot-link" onClick={() => switchMode('forgot')}>
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {mode === 'register' && (
              <div className="auth-consent-block" aria-label="Autorizaciones legales">
                <label className="auth-consent-item">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formState.acceptTerms}
                    onChange={handleChange}
                  />
                  <span>
                    Acepto los <Link to="/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</Link>.
                  </span>
                </label>

                <label className="auth-consent-item">
                  <input
                    type="checkbox"
                    name="acceptDataPolicy"
                    checked={formState.acceptDataPolicy}
                    onChange={handleChange}
                  />
                  <span>
                    Autorizo el tratamiento de datos personales conforme a la <Link to="/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</Link> y Ley 1581 de 2012.
                  </span>
                </label>

                <label className="auth-consent-item">
                  <input
                    type="checkbox"
                    name="acceptMarketing"
                    checked={formState.acceptMarketing}
                    onChange={handleChange}
                  />
                  <span>
                    Deseo recibir comunicaciones comerciales (opcional).
                  </span>
                </label>
              </div>
            )}

            {error && <p className="auth-error">{error}</p>}
            {successMessage && <p className="auth-success">{successMessage}</p>}

            <button type="submit" className="btn-primary auth-submit-button" disabled={isSubmitting}>
              {isSubmitting
                ? 'Procesando...'
                : mode === 'forgot'
                  ? 'Enviar instrucciones'
                  : mode === 'login'
                    ? 'Entrar'
                    : 'Crear cuenta'}
            </button>

            {mode === 'forgot' && (
              <button type="button" className="auth-back-link" onClick={() => switchMode('login')}>
                Volver al inicio de sesión
              </button>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;