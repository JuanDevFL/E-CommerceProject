import { useEffect, useState } from 'react';

const slides = [
  {
    src: 'https://images.pexels.com/photos/35666033/pexels-photo-35666033.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Bolsos de cuero en tonos tierra sobre fondo blanco.',
    eyebrow: 'Editorial Azami',
    title: 'Piezas con estructura y presencia.',
    description: 'Diseños que equilibran forma, durabilidad y elegancia natural para acompañarte cada día.'
  },
  {
    src: 'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Bolso rosa de cuero en una composición floral.',
    eyebrow: 'Selección cápsula',
    title: 'Color, textura y detalle artesanal.',
    description: 'Materiales premium seleccionados a mano en tonos que se adaptan a tu estilo y personalidad.'
  },
  {
    src: 'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Bolso negro y rojo sobre una composición geométrica.',
    eyebrow: 'Estilo de estudio',
    title: 'Contraste limpio para la colección.',
    description: 'Una selección de contrastes audaces que dan carácter a cada conjunto, de día o de noche.'
  },
  {
    src: 'https://images.pexels.com/photos/5706269/pexels-photo-5706269.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Bolsos pequeños de cuero en un set minimalista.',
    eyebrow: 'Avance de temporada',
    title: 'Siluetas compactas y acabados suaves.',
    description: 'Formatos pensados para el movimiento moderno: ligeros, versátiles y con acabado de lujo artesanal.'
  }
];

const AUTOPLAY_MS = 4800;

function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, []);

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
                <div className="carousel-copy-column">
                  <div className="carousel-copy">
                    <p className="carousel-eyebrow">{slide.eyebrow}</p>
                    <h2 className="carousel-title">{slide.title}</h2>
                    <p className="carousel-description">{slide.description}</p>
                  </div>
                </div>

                <div className="carousel-visual-column">
                  <div className="carousel-media">
                    <img
                      src={slide.src}
                      alt={slide.alt}
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

        <p className="carousel-meta">
          {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} · colección editorial Azami
        </p>
      </div>
    </section>
  );
}

export default HeroCarousel;