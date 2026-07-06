import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCatalog from '../components/ProductCatalog.jsx';

function CatalogPage({ catalogProducts, catalogNotice, catalogLoading, wishlistIds, onAddToCart, onBuyNow, onToggleWishlist }) {
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo') || 'Todos';

  return (
    <main className="catalog-page">
      <div className="catalog-page-header">
        <p className="catalog-page-eyebrow">Colección completa</p>
        <h1 className="catalog-page-title">Nuestro catálogo</h1>
        <p className="catalog-page-subtitle">
          Explora todas nuestras piezas y filtra por tipo, tono o disponibilidad.
        </p>
      </div>

      <ProductCatalog
        products={catalogProducts}
        notice={catalogNotice}
        isLoading={catalogLoading}
        wishlistIds={wishlistIds}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
        onToggleWishlist={onToggleWishlist}
        initialCategory={tipoParam}
      />
    </main>
  );
}

export default CatalogPage;
