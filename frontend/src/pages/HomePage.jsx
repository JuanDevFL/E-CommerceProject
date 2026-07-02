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
              Bolsos · Accesorios · Colección 2025
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

      <section className="site-section bg-surface py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="mx-auto max-w-3xl text-base leading-7 text-muted space-y-5">
            <p>Azami Studio nace de la convicción de que los accesorios de lujo deben ser honestos: honestos en sus materiales, en su manufactura y en su propósito. Cada pieza pasa por un proceso artesanal riguroso antes de llegar a tus manos.</p>
            <p>Trabajamos con cueros seleccionados, herrajes de primera calidad y líneas de diseño que evitan la tendencia pasajera. El resultado son bolsos que no solo acompañan un atuendo, sino que definen un estilo propio y duradero.</p>
            <p>Nuestra colección se renueva por temporadas cortas y controladas. Producimos en lotes pequeños para garantizar atención al detalle en cada unidad, lo que también convierte cada pieza en algo genuinamente exclusivo.</p>
            <p>Si buscas un accesorio con historia, con carácter y con la solidez de lo bien hecho, estás en el lugar correcto. Explora nuestra selección y encuentra la pieza que lleva tu nombre.</p>
          </div>
        </div>
      </section>

      <section className="site-section featured-section py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Selección curada</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Productos destacados</h2>
          </div>
          <FeaturedCarousel products={catalogProducts} />
        </div>
      </section>

      <section className="site-section bg-surface-alt py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="mx-auto max-w-3xl text-base leading-7 text-muted space-y-5">
            <p>Cada temporada Azami presenta una selección cápsula construida alrededor de un concepto de color y forma. No seguimos tendencias masivas: creamos referencias propias que evolucionan con quienes las llevan.</p>
            <p>Nuestro proceso de curaduría incluye pruebas de resistencia, validación de herrajes y revisión de costuras antes de aprobar cualquier diseño para producción. La calidad no es un argumento de venta, es una condición de entrada.</p>
            <p>Ofrecemos envío a todo el territorio nacional con empaque especial para cada pedido. Si tienes preguntas sobre alguna pieza, nuestro equipo está disponible por WhatsApp para orientarte antes de tu compra.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;