import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUsuario, registerUsuario } from '../api.js';

const initialState = {
  nombre: '',
  email: '',
  password: '',
};

function AuthPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setFormState(initialState);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = mode === 'register'
        ? await registerUsuario(formState)
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
              <h2>{mode === 'login' ? 'Bienvenida de vuelta' : 'Crear cuenta Azami'}</h2>
              <p>
                {mode === 'login'
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

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary auth-submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;