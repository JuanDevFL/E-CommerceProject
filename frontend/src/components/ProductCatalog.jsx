import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/pricing.js';
import { translateCategoryLabel, translateProductTagLabel } from '../utils/catalogLabels.js';
import { fetchCmsFilters } from '../api.js';

const TONE_TO_HEX = {
  negro: '#121212',
  marfil: '#f6f0e6',
  crema: '#eadfca',
  borgona: '#701f33',
  vino: '#6f112f',
  camel: '#c99657',
  cafe: '#704214',
  chocolate: '#4e342e',
  azul: '#1f4b99',
  verde: '#2f7f54',
  rojo: '#b33636',
  blanco: '#fafafa',
  gris: '#8d93a3',
  morado: '#7a4fb6',
  lila: '#b095d9',
  rosa: '#d36e9f',
};

function normalizeToneForLookup(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function resolveSwatchColor(variant) {
  if (variant?.hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(variant.hex)) {
    return variant.hex;
  }

  const key = normalizeToneForLookup(variant?.nombre);
  return TONE_TO_HEX[key] || '#d4d4d8';
}

function ProductCard({ product, wishlistIds, onToggleWishlist, onAddToCart, onBuyNow }) {
  const gallery = Array.isArray(product.image_urls) && product.image_urls.length > 0
    ? product.image_urls
    : [product.imagen_url].filter(Boolean);

  const colorVariants = Array.isArray(product.color_variants) && product.color_variants.length > 0
    ? product.color_variants
    : [{ nombre: product.tono || 'Base', hex: '', imagen_url: product.imagen_url || gallery[0] || '' }];

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedColorIndex(0);
    setSelectedImageIndex(0);
  }, [product.id]);

  const selectedVariant = colorVariants[selectedColorIndex] || colorVariants[0];
  const currentImage = selectedVariant?.imagen_url || gallery[selectedImageIndex] || product.imagen_url;
  const cardImages = [...new Set([currentImage, ...gallery].filter(Boolean))].slice(0, 3);

  while (cardImages.length < 3 && cardImages.length > 0) {
    cardImages.push(cardImages[cardImages.length - 1]);
  }

  const shownImage = cardImages[selectedImageIndex] || cardImages[0] || product.imagen_url;

  const cycleImage = (direction) => {
    if (!cardImages.length) return;
    setSelectedImageIndex((current) => {
      if (direction === 'next') {
        return (current + 1) % cardImages.length;
      }
      return (current - 1 + cardImages.length) % cardImages.length;
    });
  };

  return (
    <article key={product.id} className="product-card">
      <div className="product-card-media">
        <Link to={`/producto/${product.id}`}>
          <img src={shownImage} alt={product.nombre} className="product-card-image" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        </Link>

        {cardImages.length > 1 && (
          <>
            <button type="button" className="product-card-carousel-control is-prev" aria-label="Imagen anterior" onClick={() => cycleImage('prev')}>
              ‹
            </button>
            <button type="button" className="product-card-carousel-control is-next" aria-label="Siguiente imagen" onClick={() => cycleImage('next')}>
              ›
            </button>
            <div className="product-card-carousel-dots" role="tablist" aria-label="Mini carrusel del producto">
              {cardImages.map((image, idx) => (
                <button
                  key={`${product.id}-${image}-${idx}`}
                  type="button"
                  className={`product-card-carousel-dot ${idx === selectedImageIndex ? 'is-active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                  aria-label={`Ver imagen ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="product-card-badges">
          <span className="product-badge product-badge-primary">{translateProductTagLabel(product.etiqueta)}</span>
          <span className="product-badge">{translateCategoryLabel(product.categoria)}</span>
        </div>
        <button
          type="button"
          className={`btn-wishlist-heart ${wishlistIds.includes(product.id) ? 'is-active' : ''}`}
          aria-label={wishlistIds.includes(product.id) ? 'Quitar de deseos' : 'Agregar a deseos'}
          onClick={() => onToggleWishlist(product.id)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill={wishlistIds.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{product.material}</span>
          <span>{selectedVariant?.nombre || product.tono}</span>
        </div>

        <div className="product-card-header">
          <h3 className="product-card-title">
            <Link to={`/producto/${product.id}`}>{product.nombre}</Link>
          </h3>
          <span className="product-card-price">{formatPrice(product.precio)}</span>
        </div>

        <p className="product-card-description">{product.descripcion}</p>

        {colorVariants.length > 0 && (
          <div className="product-card-colors" aria-label={`Colores de ${product.nombre}`}>
            {colorVariants.map((variant, idx) => (
              <button
                key={`${product.id}-${variant.nombre}-${idx}`}
                type="button"
                className={`product-card-color-dot ${idx === selectedColorIndex ? 'is-active' : ''}`}
                style={{ '--dot-color': resolveSwatchColor(variant) }}
                aria-label={`Color ${variant.nombre}`}
                title={variant.nombre}
                onClick={() => {
                  setSelectedColorIndex(idx);
                  setSelectedImageIndex(0);
                }}
              />
            ))}
          </div>
        )}

        <div className="product-card-footer">
          <span className={`product-card-stock ${product.stock === 0 ? 'is-empty' : ''}`}>
            {product.stock > 0 ? `${product.stock} disponibles` : 'Próximamente'}
          </span>
          <div className="product-card-actions">
            <button
              type="button"
              className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
            >
              {product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
            </button>
            <button
              type="button"
              className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
              onClick={() => onBuyNow?.(product)}
              disabled={product.stock === 0}
            >
              Comprar ahora
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ProductCatalog({
  products,
  notice,
  isLoading,
  wishlistIds = [],
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  initialCategory = 'Todos',
  initialTone = 'Todos',
  headingEyebrow = 'Selección Azami',
  headingTitle = 'Catálogo curado con filtros por estilo y tono',
  headingDescription = 'Empezamos con una selección editorial para que la tienda tenga producto realista desde ahora, mientras el catálogo en vivo sigue creciendo.',
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeTone, setActiveTone] = useState(initialTone);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cmsCategories, setCmsCategories] = useState([]);
  const [cmsTones, setCmsTones] = useState([]);

  useEffect(() => {
    fetchCmsFilters()
      .then((data) => {
        if (data.categorias?.length) setCmsCategories(data.categorias);
        if (data.tonos?.length) setCmsTones(data.tonos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setActiveCategory(initialCategory);
    setActiveTone(initialTone);
  }, [initialCategory, initialTone]);

  // Cerrar con Escape
  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filterOpen]);

  const categories = ['Todos', ...(cmsCategories.length ? cmsCategories : [...new Set(products.map((p) => p.categoria))])];
  const tones      = ['Todos', ...(cmsTones.length      ? cmsTones      : [...new Set(products.map((p) => p.tono))])];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'Todos' || product.categoria === activeCategory;
    const matchesTone = activeTone === 'Todos' || product.tono === activeTone;
    return matchesCategory && matchesTone;
  });

  const activeFilterCount = (activeCategory !== 'Todos' ? 1 : 0) + (activeTone !== 'Todos' ? 1 : 0);

  const resetFilters = useCallback(() => {
    setActiveCategory('Todos');
    setActiveTone('Todos');
  }, []);

  return (
    <section className="catalog-shell">
      <div className="catalog-header">
        <div className="catalog-heading-block">
          <p className="catalog-eyebrow">{headingEyebrow}</p>
          <h2 className="catalog-title">{headingTitle}</h2>
          <p className="catalog-description">{headingDescription}</p>
        </div>

        <div className="catalog-summary">
          <span>{products.length} piezas visibles</span>
          <span>{categories.length - 1} categorías</span>
          <span>{tones.length - 1} tonos</span>
        </div>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="catalog-filter-trigger-row">
        <button
          type="button"
          className="catalog-filter-btn"
          onClick={() => setFilterOpen(true)}
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
        >
          <FilterIcon />
          Filtros
          {activeFilterCount > 0 && (
            <span className="catalog-filter-count">{activeFilterCount}</span>
          )}
        </button>

        {activeCategory !== 'Todos' && (
          <span className="catalog-filter-active-chip">
            {translateCategoryLabel(activeCategory)}
            <button type="button" onClick={() => setActiveCategory('Todos')} aria-label="Quitar filtro de categoría">✕</button>
          </span>
        )}
        {activeTone !== 'Todos' && (
          <span className="catalog-filter-active-chip">
            {activeTone}
            <button type="button" onClick={() => setActiveTone('Todos')} aria-label="Quitar filtro de tono">✕</button>
          </span>
        )}
        {activeFilterCount > 0 && (
          <button type="button" className="catalog-filter-clear" onClick={resetFilters}>
            Limpiar filtros
          </button>
        )}

        <span className="catalog-filter-result-count">{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Popup de filtros ── */}
      {filterOpen && (
        <div className="catalog-filter-overlay" role="dialog" aria-modal="true" aria-label="Panel de filtros">
          <div className="catalog-filter-backdrop" onClick={() => setFilterOpen(false)} />

          <div className="catalog-filter-popup">
            <div className="catalog-filter-popup-header">
              <span className="catalog-filter-popup-title">Filtros</span>
              <div className="catalog-filter-popup-actions">
                {activeFilterCount > 0 && (
                  <button type="button" className="catalog-filter-clear" onClick={resetFilters}>
                    Limpiar todo
                  </button>
                )}
                <button type="button" className="catalog-filter-close-btn" onClick={() => setFilterOpen(false)} aria-label="Cerrar filtros">
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="catalog-filter-popup-body">
              <div className="catalog-filter-block">
                <span className="catalog-filter-label">Categoría</span>
                <div className="catalog-chip-row">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`catalog-chip ${category === activeCategory ? 'is-active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {translateCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="catalog-filter-block">
                <span className="catalog-filter-label">Tono</span>
                <div className="catalog-chip-row">
                  {tones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      className={`catalog-chip ${tone === activeTone ? 'is-active' : ''}`}
                      onClick={() => setActiveTone(tone)}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="catalog-filter-popup-footer">
              <button type="button" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold w-full" onClick={() => setFilterOpen(false)}>
                Ver {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {(notice || isLoading) && (
        <p className="catalog-notice">
          {isLoading ? 'Sincronizando catálogo en vivo...' : notice}
        </p>
      )}

      {filteredProducts.length === 0 ? (
        <div className="catalog-empty-state">
          <h3>No hay productos con esos filtros.</h3>
          <p>Prueba otra categoría o habilita nuevamente todos los tonos disponibles.</p>
          <button
            type="button"
            className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold"
            onClick={() => {
              setActiveCategory('Todos');
              setActiveTone('Todos');
            }}
          >
            Reiniciar filtros
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wishlistIds={wishlistIds}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductCatalog;