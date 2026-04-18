import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { resetPassword } from '../api.js';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({ token, password });
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
            <p>Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.</p>
          </div>

          <label className="auth-field">
            <span>Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
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
              minLength={6}
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
