import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCatalog from '../components/ProductCatalog.jsx';

function CatalogPage({
  catalogProducts,
  catalogNotice,
  catalogLoading,
  catalogHeadingEyebrow,
  catalogHeadingTitle,
  catalogHeadingDescription,
  wishlistIds,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}) {
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo') || 'Todos';
  const tonoParam = searchParams.get('tono') || 'Todos';

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
        initialTone={tonoParam}
        headingEyebrow={catalogHeadingEyebrow}
        headingTitle={catalogHeadingTitle}
        headingDescription={catalogHeadingDescription}
      />
    </main>
  );
}

export default CatalogPage;
