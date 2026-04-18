import { Link } from 'react-router-dom';

function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <p className="about-eyebrow">Nuestra historia</p>
        <h1 className="about-hero-title">AZAMI</h1>
        <p className="about-hero-subtitle">Lujo artesanal con alma contemporánea</p>
      </section>

      <section className="about-section">
        <div className="about-section-inner">
          <h2 className="about-heading">Quiénes somos</h2>
          <p className="about-text">
            Azami nació de la pasión por el diseño artesanal y la convicción de que el lujo auténtico
            se construye con dedicación, materiales nobles y un respeto profundo por la tradición.
            Cada pieza que creamos cuenta una historia de artesanía, innovación y elegancia atemporal.
          </p>
          <p className="about-text">
            Nuestro equipo de artesanos combina técnicas ancestrales con diseño contemporáneo
            para crear bolsos y accesorios que trascienden las tendencias y se convierten en
            compañeros de vida.
          </p>
        </div>
      </section>

      <section className="about-section about-section-alt">
        <div className="about-section-inner">
          <h2 className="about-heading">Nuestros materiales</h2>
          <div className="about-features">
            <div className="about-feature">
              <span className="about-feature-icon">✦</span>
              <h3>Cuero premium</h3>
              <p>Seleccionamos las mejores pieles de curtidurías certificadas, garantizando calidad y origen ético.</p>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">✦</span>
              <h3>Herrajes artesanales</h3>
              <p>Cada cierre, hebilla y detalle metálico es fabricado a mano con aleaciones de alta resistencia.</p>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">✦</span>
              <h3>Forros de seda</h3>
              <p>El interior de nuestros bolsos está revestido en seda natural, cuidando cada detalle invisible.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-section-inner">
          <h2 className="about-heading">Proceso artesanal</h2>
          <div className="about-process">
            <div className="about-process-step">
              <span className="about-step-number">01</span>
              <h3>Diseño</h3>
              <p>Cada colección comienza con bocetos a mano, inspirados en arquitectura, naturaleza y arte.</p>
            </div>
            <div className="about-process-step">
              <span className="about-step-number">02</span>
              <h3>Selección</h3>
              <p>Viajamos a las mejores curtidurías para elegir personalmente cada pieza de cuero.</p>
            </div>
            <div className="about-process-step">
              <span className="about-step-number">03</span>
              <h3>Confección</h3>
              <p>Nuestros artesanos dedican entre 20 y 40 horas a cada bolso, cosiendo a mano cada puntada.</p>
            </div>
            <div className="about-process-step">
              <span className="about-step-number">04</span>
              <h3>Acabado</h3>
              <p>Control de calidad riguroso y empaque artesanal para una experiencia completa.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-section-alt about-contact">
        <div className="about-section-inner">
          <h2 className="about-heading">Contacto</h2>
          <p className="about-text">
            Creamos piezas para tu estilo. Escríbenos para pedidos personalizados, colaboraciones o atención postventa.
          </p>
          <a
            href="mailto:contacto@azami.com"
            className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold inline-flex mt-4"
          >
            contacto@azami.com
          </a>
        </div>
      </section>

      <section className="about-section about-cta">
        <div className="about-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="about-heading">Descubre nuestra colección</h2>
          <p className="about-text">
            Explora las piezas que definen el lujo artesanal contemporáneo.
          </p>
          <Link to="/catalogo" className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold inline-flex mt-6">
            Ver catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
