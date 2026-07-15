import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api.js';

function ResetPasswordPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!token) {
      if (!email.trim()) {
        setError('Debes ingresar el correo registrado.');
        return;
      }

      if (!pin.trim()) {
        setError('Debes ingresar el PIN enviado al correo.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = token
        ? { token, password }
        : { email: email.trim(), pin: pin.trim(), password };

      const result = await resetPassword(payload);
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="reset-shell">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h2>Nueva contraseña</h2>
            <p>
              {token
                ? 'Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.'
                : 'Ingresa tu correo, el PIN enviado y tu nueva contraseña.'}
            </p>
          </div>

          {!token ? (
            <>
              <label className="auth-field">
                <span>Correo registrado</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  disabled={!!success}
                />
              </label>

              <label className="auth-field">
                <span>PIN de verificación</span>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  disabled={!!success}
                />
              </label>
            </>
          ) : null}

          <label className="auth-field">
            <span>Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              disabled={!!success}
            />
          </label>

          <label className="auth-field">
            <span>Confirmar contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              disabled={!!success}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          {success ? (
            <button type="button" className="btn-primary auth-submit-button" onClick={() => navigate('/auth')}>
              Ir a iniciar sesión
            </button>
          ) : (
            <button type="submit" className="btn-primary auth-submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Restablecer contraseña'}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
