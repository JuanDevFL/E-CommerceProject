import { useEffect, useState } from 'react';
import { fetchCmsCarousel } from '../api.js';

const FALLBACK_SLIDES = [
  {
    src: 'https://images.pexels.com/photos/35666033/pexels-photo-35666033.jpeg?auto=compress&cs=tinysrgb&w=1600',
    eyebrow: 'Editorial Azami',
    title: 'Piezas con estructura y presencia.',
    description: 'Diseños que equilibran forma, durabilidad y elegancia natural para acompañarte cada día.'
  },
  {
    src: 'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
    eyebrow: 'Selección cápsula',
    title: 'Color, textura y detalle artesanal.',
    description: 'Materiales premium seleccionados a mano en tonos que se adaptan a tu estilo y personalidad.'
  },
  {
    src: 'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
    eyebrow: 'Estilo de estudio',
    title: 'Contraste limpio para la colección.',
    description: 'Una selección de contrastes audaces que dan carácter a cada conjunto, de día o de noche.'
  },
];

const AUTOPLAY_MS = 4800;

function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState(FALLBACK_SLIDES);

  useEffect(() => {
    fetchCmsCarousel()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data.map((s) => ({
            src: s.imagen_url,
            eyebrow: s.eyebrow || '',
            title: s.titulo || '',
            description: s.descripcion || '',
          })));
        }
      })
      .catch(() => { /* mantiene fallback */ });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => setActiveIndex(index);

  const showPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length);
  };

  const showNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  return (
    <section className="carousel-shell mt-10" aria-label="Carrusel editorial Azami">
      <div className="carousel-stage">
        <div className="carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((slide) => (
            <article key={slide.src} className="carousel-slide">
              <div className="carousel-backdrop" style={{ backgroundImage: `url(${slide.src})` }} />
              <div className="carousel-overlay" />
              <div className="carousel-layout">
                <div className="carousel-visual-column">
                  <div className="carousel-media">
                    <img
                      src={slide.src}
                      alt={slide.title || 'Imagen de carrusel'}
                      className="carousel-image"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="carousel-controls">
          <button type="button" className="carousel-control-button" aria-label="Imagen anterior" onClick={showPrevious}>
            &lt;
          </button>
          <button type="button" className="carousel-control-button" aria-label="Siguiente imagen" onClick={showNext}>
            &gt;
          </button>
        </div>
      </div>

      <div className="carousel-footer">
        <div className="carousel-dots" role="tablist" aria-label="Selector de imágenes">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              className={`carousel-dot ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Ir a la imagen ${index + 1}`}
              aria-selected={index === activeIndex}
              role="tab"
            />
          ))}
        </div>

        <p className="carousel-meta">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</p>
      </div>
    </section>
  );
}

export default HeroCarousel;