import { useParams, Link } from 'react-router-dom';

function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductDetailPage({ products, wishlistIds = [], onAddToCart, onToggleWishlist }) {
  const { productId } = useParams();
  const product = products.find((p) => String(p.id) === String(productId));

  if (!product) {
    return (
      <main className="product-detail-page">
        <div className="product-detail-empty">
          <h2>Producto no encontrado</h2>
          <p>El producto que buscas no existe o fue removido.</p>
          <Link to="/" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold inline-flex">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const isFav = wishlistIds.includes(product.id);

  return (
    <main className="product-detail-page">
      <div className="product-detail-breadcrumb">
        <Link to="/">Inicio</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/catalogo">Catálogo</Link>
        <span className="breadcrumb-sep">/</span>
        <span>{product.nombre}</span>
      </div>

      <div className="product-detail-grid">
        <div className="product-detail-media">
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="product-detail-image"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className="product-detail-badges">
            <span className="product-badge product-badge-primary">{product.etiqueta}</span>
            <span className="product-badge">{product.categoria}</span>
          </div>
        </div>

        <div className="product-detail-info">
          <div className="product-detail-meta">
            <span>{product.material}</span>
            <span>{product.tono}</span>
          </div>

          <h1 className="product-detail-title">{product.nombre}</h1>
          <p className="product-detail-price">{formatPrice(product.precio)}</p>
          <p className="product-detail-description">{product.descripcion}</p>

          <div className="product-detail-stock">
            <span className={product.stock === 0 ? 'is-empty' : ''}>
              {product.stock > 0 ? `${product.stock} disponibles` : 'Próximamente'}
            </span>
          </div>

          <div className="product-detail-actions">
            <button
              type="button"
              className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
            >
              {product.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
            </button>

            <button
              type="button"
              className={`btn-wishlist-heart btn-wishlist-heart-lg ${isFav ? 'is-active' : ''}`}
              aria-label={isFav ? 'Quitar de deseos' : 'Agregar a deseos'}
              onClick={() => onToggleWishlist(product.id)}
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProductDetailPage;
