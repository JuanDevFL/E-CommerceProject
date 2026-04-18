import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel.jsx';
import { curatedProducts } from '../data/curatedProducts.js';

const featuredIds = ['curated-1', 'curated-3', 'curated-5'];
const featuredProducts = curatedProducts.filter((p) => featuredIds.includes(p.id));

function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function FeaturedCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % featuredProducts.length), 4000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (i) => { setCurrent(i); resetTimer(); };
  const prev = () => goTo((current - 1 + featuredProducts.length) % featuredProducts.length);
  const next = () => goTo((current + 1) % featuredProducts.length);

  const product = featuredProducts[current];

  return (
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
        {featuredProducts.map((_, i) => (
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
  );
}

function HomePage() {
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
              Bolsos · Accesorios · Colección 2025
            </p>
          </div>

          <HeroCarousel />
        </div>
      </section>

      <section className="site-section bg-surface py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="mx-auto max-w-3xl text-base leading-7 text-muted space-y-5">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras vehicula, mi eget laoreet venenatis, sem eros scelerisque nulla, at volutpat nisl eros sed libero. Proin gravida hendrerit lectus a molestie.</p>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit.</p>
            <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.</p>
            <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
            <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.</p>
          </div>
        </div>
      </section>

      <section className="site-section featured-section py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Selección curada</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Productos destacados</h2>
          </div>
          <FeaturedCarousel />
        </div>
      </section>

      <section id="about" className="site-section bg-surface-alt py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Nueva colección</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-heading sm:text-5xl">Hecha para durar</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Descubre diseños artesanales pensados para acompañarte con estilo y durabilidad.
            </p>
            <Link
              to="/catalogo"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-background-alt px-6 py-3 text-sm font-semibold text-surface transition hover:bg-background"
            >
              Ver colección →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;