import { useEffect } from 'react';

function AnnouncementPopup({ announcements, currentIndex, onSelect, onClose }) {
  const current = announcements[currentIndex] || announcements[0];

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!current) {
    return null;
  }

  return (
    <div className="announcement-overlay" onClick={onClose}>
      <div className="announcement-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="announcement-close" onClick={onClose} aria-label="Cerrar anuncios">×</button>

        <div className="announcement-media-wrap">
          <img src={current.imagen_url} alt={`Anuncio ${currentIndex + 1}`} className="announcement-media" loading="eager" referrerPolicy="no-referrer" />
        </div>

        <div className="announcement-footer">
          <p>Anuncio {currentIndex + 1} de {announcements.length}</p>
          <div className="announcement-dots">
            {announcements.map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                className={`announcement-dot ${index === currentIndex ? 'is-active' : ''}`}
                onClick={() => onSelect(index)}
                aria-label={`Ir al anuncio ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementPopup;
