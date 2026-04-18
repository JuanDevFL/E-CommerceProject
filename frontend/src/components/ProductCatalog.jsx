import { useState } from 'react';
import { Link } from 'react-router-dom';

function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function ProductCatalog({ products, notice, isLoading, wishlistIds = [], onAddToCart, onToggleWishlist }) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeTone, setActiveTone] = useState('Todos');
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const categories = ['Todos', ...new Set(products.map((product) => product.categoria))];
  const tones = ['Todos', ...new Set(products.map((product) => product.tono))];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'Todos' || product.categoria === activeCategory;
    const matchesTone = activeTone === 'Todos' || product.tono === activeTone;
    const matchesAvailability = !onlyAvailable || product.stock > 0;

    return matchesCategory && matchesTone && matchesAvailability;
  });

  return (
    <section className="catalog-shell">
      <div className="catalog-header">
        <div className="catalog-heading-block">
          <p className="catalog-eyebrow">Selección Azami</p>
          <h2 className="catalog-title">Catálogo curado con filtros por estilo y tono</h2>
          <p className="catalog-description">
            Empezamos con una selección editorial para que el storefront tenga producto realista desde ahora,
            mientras el catálogo en vivo sigue creciendo.
          </p>
        </div>

        <div className="catalog-summary">
          <span>{products.length} piezas visibles</span>
          <span>{categories.length - 1} categorías</span>
          <span>{tones.length - 1} tonos</span>
        </div>
      </div>

      <div className="catalog-toolbar">
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
                {category}
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

        <label className="catalog-toggle">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => setOnlyAvailable(event.target.checked)}
          />
          Mostrar solo disponibles
        </label>
      </div>

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
              setOnlyAvailable(false);
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
                  <span className="product-badge product-badge-primary">{product.etiqueta}</span>
                  <span className="product-badge">{product.categoria}</span>
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
                  <button
                    type="button"
                    className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                  </button>
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