import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '../utils/pricing.js';
import { translateCategoryLabel, translateProductTagLabel } from '../utils/catalogLabels.js';

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

function resolveVariantColor(variant) {
  if (variant?.hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(variant.hex)) {
    return variant.hex;
  }

  const key = normalizeToneForLookup(variant?.nombre);
  return TONE_TO_HEX[key] || '#d4d4d8';
}

function ProductDetailPage({ products, productsLoading = false, wishlistIds = [], onAddToCart, onBuyNow, onToggleWishlist }) {
  const { productId } = useParams();
  const product = products.find((p) => String(p.id) === String(productId));

  if (!product && productsLoading) {
    return (
      <main className="product-detail-page">
        <div className="product-detail-skeleton">
          <div className="product-detail-skeleton-media" />
          <div className="product-detail-skeleton-info">
            <div className="product-detail-skeleton-line short" />
            <div className="product-detail-skeleton-line" />
            <div className="product-detail-skeleton-line" />
            <div className="product-detail-skeleton-line medium" />
          </div>
        </div>
      </main>
    );
  }

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
  const imageGallery = useMemo(() => {
    const images = Array.isArray(product.image_urls) ? product.image_urls : [];
    const unique = [...new Set([product.imagen_url, ...images].filter(Boolean))];
    return unique.length > 0 ? unique : [product.imagen_url].filter(Boolean);
  }, [product]);

  const colorVariants = Array.isArray(product.color_variants) && product.color_variants.length > 0
    ? product.color_variants
    : [{ nombre: product.tono || 'Base', imagen_url: product.imagen_url, hex: '' }];

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedVariant = colorVariants[selectedColorIndex] || colorVariants[0];
  const selectedVariantGallery = useMemo(() => {
    const variantImages = Array.isArray(selectedVariant?.image_urls) ? selectedVariant.image_urls : [];
    const unique = [...new Set([selectedVariant?.imagen_url, ...variantImages, ...imageGallery].filter(Boolean))];
    return unique.length > 0 ? unique : imageGallery;
  }, [selectedVariant, imageGallery]);

  useEffect(() => {
    setSelectedColorIndex(0);
    setSelectedImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColorIndex]);

  const selectedImage = selectedVariantGallery[selectedImageIndex] || selectedVariantGallery[0] || product.imagen_url;

  const selectedTone = selectedVariant?.nombre || product.tono;

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
            src={selectedImage || product.imagen_url}
            alt={product.nombre}
            className="product-detail-image"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          {selectedVariantGallery.length > 1 && (
            <div className="product-detail-thumbs">
              {selectedVariantGallery.map((image, index) => (
                <button
                  key={`${product.id}-${image}-${index}`}
                  type="button"
                  className={`product-detail-thumb ${image === selectedImage ? 'is-active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img src={image} alt={`Miniatura ${index + 1} de ${product.nombre}`} loading="lazy" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
          <div className="product-detail-badges">
            <span className="product-badge product-badge-primary">{translateProductTagLabel(product.etiqueta)}</span>
            <span className="product-badge">{translateCategoryLabel(product.categoria)}</span>
          </div>
        </div>

        <div className="product-detail-info">
          <div className="product-detail-meta">
            <span>{product.material}</span>
            <span>{selectedTone}</span>
          </div>

          {colorVariants.length > 0 && (
            <div className="product-detail-color-row">
              {colorVariants.map((variant, index) => (
                <button
                  key={`${product.id}-${variant.nombre}-${index}`}
                  type="button"
                  className={`product-detail-color-dot ${selectedColorIndex === index ? 'is-active' : ''}`}
                  onClick={() => setSelectedColorIndex(index)}
                  style={{ '--dot-color': resolveVariantColor(variant) }}
                  aria-label={`Color ${variant.nombre}`}
                  data-color-name={variant.nombre}
                  title={variant.nombre}
                >
                  <span className="sr-only">{variant.nombre}</span>
                </button>
              ))}
            </div>
          )}

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
              className="btn-secondary rounded-full px-8 py-3.5 text-sm font-semibold"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
            >
              {product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
            </button>

            <button
              type="button"
              className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold"
              onClick={() => onBuyNow?.(product)}
              disabled={product.stock === 0}
            >
              Comprar ahora
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
