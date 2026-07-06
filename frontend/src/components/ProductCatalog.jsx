import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/pricing.js';
import { translateCategoryLabel, translateProductTagLabel } from '../utils/catalogLabels.js';

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

function ProductCatalog({ products, notice, isLoading, wishlistIds = [], onAddToCart, onBuyNow, onToggleWishlist, initialCategory = 'Todos', initialTone = 'Todos' }) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeTone, setActiveTone] = useState(initialTone);
  const [filterOpen, setFilterOpen] = useState(false);

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

  const categories = ['Todos', ...new Set(products.map((p) => p.categoria))];
  const tones = ['Todos', ...new Set(products.map((p) => p.tono))];

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
          <p className="catalog-eyebrow">Selección Azami</p>
          <h2 className="catalog-title">Catálogo curado con filtros por estilo y tono</h2>
          <p className="catalog-description">
            Empezamos con una selección editorial para que la tienda tenga producto realista desde ahora,
            mientras el catálogo en vivo sigue creciendo.
          </p>
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
            <article key={product.id} className="product-card">
              <div className="product-card-media">
                <Link to={`/producto/${product.id}`}>
                  <img src={product.imagen_url} alt={product.nombre} className="product-card-image" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                </Link>
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
                  <span>{product.tono}</span>
                </div>

                <div className="product-card-header">
                  <h3 className="product-card-title">
                    <Link to={`/producto/${product.id}`}>{product.nombre}</Link>
                  </h3>
                  <span className="product-card-price">{formatPrice(product.precio)}</span>
                </div>

                <p className="product-card-description">{product.descripcion}</p>

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
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductCatalog;