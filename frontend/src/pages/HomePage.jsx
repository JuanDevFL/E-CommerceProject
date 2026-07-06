import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel.jsx';
import { curatedProducts } from '../data/curatedProducts.js';
import { formatPrice } from '../utils/pricing.js';

function FeaturedCarousel({ products }) {
  const featured = (products && products.length > 0 ? products : curatedProducts)
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 4000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i) => { setCurrent(i); resetTimer(); };
  const prev = () => goTo((current - 1 + featured.length) % featured.length);
  const next = () => goTo((current + 1) % featured.length);

  const product = featured[current];

  return (
    <>
      <div
        className="featured-section-bg"
        style={{ backgroundImage: `url(${product.imagen_url})` }}
        aria-hidden="true"
      />
      <div className="featured-carousel">
      <button type="button" className="featured-carousel-arrow left" onClick={prev} aria-label="Anterior">‹</button>

      <div className="featured-carousel-slide" key={product.id}>
        <img
          src={product.imagen_url}
          alt={product.nombre}
          className="featured-carousel-img"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="featured-carousel-info">
          {product.etiqueta && <span className="featured-carousel-tag">{product.etiqueta}</span>}
          <h3 className="featured-carousel-name">{product.nombre}</h3>
          <p className="featured-carousel-desc">{product.descripcion}</p>
          <span className="featured-carousel-price">{formatPrice(product.precio)}</span>
          <button
            type="button"
            className="featured-carousel-btn"
            onClick={() => navigate(`/producto/${product.id}`)}
          >
            Ver producto →
          </button>
        </div>
      </div>

      <button type="button" className="featured-carousel-arrow right" onClick={next} aria-label="Siguiente">›</button>

      <div className="featured-carousel-dots">
        {featured.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`featured-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Producto ${i + 1}`}
          />
        ))}
      </div>
    </div>
    </>
  );
}

function VisualStorySection({ products }) {
  const visualItems = (products && products.length > 0 ? products : curatedProducts).slice(0, 8);

  return (
    <section className="site-section bg-surface py-10 sm:py-14">
      <div className="site-section-inner">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.34em] text-muted">Galería Azami</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Selección visual de temporada</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visualItems.map((item, index) => {
            return (
              <article
                key={`${item.id || item.nombre}-${index}`}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-background-alt"
              >
                <img
                  src={item.imagen_url}
                  alt={item.nombre}
                  className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />

                <div className="space-y-1 p-4">
                  <p className="line-clamp-1 text-sm font-semibold text-heading">{item.nombre}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">{formatPrice(item.precio)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ValuePropsSection() {
  return (
    <section className="site-section bg-surface-alt py-10 sm:py-14">
      <div className="site-section-inner">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs uppercase tracking-[0.34em] text-muted">Comprar en Azami</p>
          <h3 className="mt-3 text-2xl font-semibold text-heading sm:text-3xl">Beneficios y métodos de pago</h3>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border/60 bg-background-alt p-5 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Envío</p>
            <p className="mt-2 text-sm font-semibold text-heading">Nacional y seguro</p>
            <p className="mt-2 text-sm text-muted">Despachamos a todo Colombia con empaque protegido.</p>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background-alt p-5 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Pago</p>
            <p className="mt-2 text-sm font-semibold text-heading">Wompi + opciones locales</p>
            <p className="mt-2 text-sm text-muted">Tarjetas, PSE y métodos habilitados por Wompi.</p>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background-alt p-5 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Soporte</p>
            <p className="mt-2 text-sm font-semibold text-heading">Acompañamiento real</p>
            <p className="mt-2 text-sm text-muted">Te orientamos por WhatsApp antes y después de la compra.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function HomePage({ catalogProducts }) {
  return (
    <main className="w-full">
      <section className="site-section bg-background-alt pb-10 pt-4 sm:pb-14 sm:pt-6">
        <div className="site-section-inner">
          <div className="mx-auto max-w-3xl py-6 text-center sm:py-10">
            <p className="text-sm uppercase tracking-[0.4em] text-muted">Lujo artesanal</p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-heading sm:text-6xl">
              Lujo artesanal
            </h1>
            <p className="mt-5 text-xs uppercase tracking-[0.35em] text-primary/90 sm:text-base sm:tracking-[0.4em]">
              Bolsos · Colección 2026
            </p>
            <p className="mt-4 text-sm leading-6 text-muted max-w-xl mx-auto">
              Descubre diseños artesanales pensados para acompañarte con estilo y durabilidad.
            </p>
            <Link
              to="/catalogo"
              className="featured-carousel-btn mt-6"
            >
              Ver colección →
            </Link>
          </div>

          <HeroCarousel />
        </div>
      </section>

      <VisualStorySection products={catalogProducts} />

      <section className="site-section featured-section py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Selección curada</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Productos destacados</h2>
          </div>
          <FeaturedCarousel products={catalogProducts} />
        </div>
      </section>

      <ValuePropsSection />
    </main>
  );
}

export default HomePage;