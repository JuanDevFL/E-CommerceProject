import HeroCarousel from '../components/HeroCarousel.jsx';
import ProductCatalog from '../components/ProductCatalog.jsx';

function HomePage({ catalogProducts, catalogNotice, catalogLoading, onAddToCart }) {
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

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <button type="button" className="pill-chip pill-chip-active">Crema</button>
              <button type="button" className="pill-chip">Borgoña</button>
              <button type="button" className="pill-chip">Marfil</button>
              <button type="button" className="pill-chip">Negro</button>
            </div>
          </div>

          <HeroCarousel />
        </div>
      </section>

      <section id="about" className="site-section bg-surface py-10 sm:py-14">
        <div className="site-section-inner">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Nueva colección</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-heading sm:text-5xl">Hecha para durar</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Descubre diseños artesanales pensados para acompañarte con estilo y durabilidad.
            </p>
            <a
              href="#productos"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-background-alt px-6 py-3 text-sm font-semibold text-surface transition hover:bg-background"
            >
              Ver colección →
            </a>
          </div>
        </div>
      </section>

      <section id="contacto" className="site-section bg-background-alt py-10 sm:py-12">
        <div className="site-section-inner">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.32em] text-muted">Contacto</p>
            <h2 className="mt-3 text-3xl font-semibold text-heading sm:text-4xl">Creamos piezas para tu estilo</h2>
            <p className="mt-4 text-sm text-muted sm:text-base">
              Escríbenos para pedidos personalizados, colaboraciones o atención postventa.
            </p>
            <a
              href="mailto:contacto@azami.com"
              className="btn-primary mt-7 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
            >
              contacto@azami.com
            </a>
          </div>
        </div>
      </section>

      <section id="productos" className="site-section bg-background py-10 sm:py-12">
        <div className="site-section-inner">
          <ProductCatalog
            products={catalogProducts}
            notice={catalogNotice}
            isLoading={catalogLoading}
            onAddToCart={onAddToCart}
          />
        </div>
      </section>
    </main>
  );
}

export default HomePage;