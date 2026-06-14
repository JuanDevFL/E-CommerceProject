import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/pricing.js';
import { translateCategoryLabel, translateProductTagLabel } from '../utils/catalogLabels.js';

function WishlistPage({ products, wishlistIds = [], onAddToCart, onBuyNow, onToggleWishlist }) {
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <main className="wishlist-page">
      <div className="wishlist-header">
        <p className="wishlist-eyebrow">Mi selección</p>
        <h1 className="wishlist-title">Lista de deseos</h1>
        <p className="wishlist-subtitle">{wishlistProducts.length} {wishlistProducts.length === 1 ? 'pieza guardada' : 'piezas guardadas'}</p>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="wishlist-empty">
          <p>Aún no has agregado productos a tu lista de deseos.</p>
          <p className="wishlist-empty-hint">Usa el botón de corazón en cualquier producto para guardarlo aquí.</p>
          <Link to="/catalogo" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold inline-flex mt-4">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlistProducts.map((product) => (
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
                  className="btn-wishlist-heart is-active"
                  aria-label="Quitar de deseos"
                  onClick={() => onToggleWishlist(product.id)}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="currentColor" strokeWidth="2">
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
    </main>
  );
}

export default WishlistPage;
