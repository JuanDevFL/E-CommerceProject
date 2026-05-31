function CookiesPage() {
  return (
    <main className="legal-page">
      <section className="legal-shell">
        <p className="legal-kicker">Legal Azami</p>
        <h1>Política de Cookies</h1>
        <p className="legal-updated">Última actualización: 7 de mayo de 2026</p>

        <article className="legal-block">
          <h2>1. ¿Qué son las cookies?</h2>
          <p>
            Son pequeños archivos que se almacenan en tu dispositivo para permitir funcionalidades,
            mejorar el rendimiento y recordar preferencias.
          </p>
        </article>

        <article className="legal-block">
          <h2>2. Tipos de cookies que usamos</h2>
          <p>
            Cookies necesarias (obligatorias), y con autorización previa, cookies de analítica y marketing.
            Puedes cambiar tu preferencia en cualquier momento.
          </p>
        </article>

        <article className="legal-block">
          <h2>3. Gestión del consentimiento</h2>
          <p>
            Al ingresar al sitio puedes aceptar todas, rechazar no esenciales o personalizar.
            La elección queda registrada para trazabilidad de consentimiento.
          </p>
        </article>

        <article className="legal-block">
          <h2>4. Revocatoria</h2>
          <p>
            Puedes revocar tu consentimiento y actualizar preferencias desde el pie de página,
            sin afectar el uso de cookies estrictamente necesarias.
          </p>
        </article>
      </section>
    </main>
  );
}

export default CookiesPage;
