import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fetchMyAddresses } from '../api';
import './CheckoutPage.css';

function formatPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildCartLines(cartItems) {
  return cartItems.map((item) => `${item.quantity}x ${item.nombre}`).join(' | ');
}

function buildWhatsappMessage({ user, cartItems, total, address, reference }) {
  const addressLine = address
    ? `${address.alias}: ${address.calle}, ${address.ciudad}, ${address.estado} ${address.codigo_postal}`
    : 'Aún no seleccioné una dirección de envío';

  return [
    `Hola, soy ${user?.name || 'un cliente'} y quiero confirmar mi pedido Azami ${reference}.`,
    `Productos: ${buildCartLines(cartItems)}.`,
    `Total estimado: ${formatPrice(total)}.`,
    `Dirección de envío: ${addressLine}.`,
    '¿Me pueden ayudar a validar disponibilidad y tiempos de entrega?',
  ].join('\n');
}

function wompiReference() {
  return `AZAMI-${Date.now().toString(36).toUpperCase()}`;
}

function WompiSandboxWidget({ amountInCents, reference, currency, publicKey, signatureIntegrity, redirectUrl }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !publicKey) return undefined;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-public-key', publicKey);
    script.setAttribute('data-currency', currency);
    script.setAttribute('data-amount-in-cents', String(amountInCents));
    script.setAttribute('data-reference', reference);
    script.setAttribute('data-redirect-url', redirectUrl);
    if (signatureIntegrity) {
      script.setAttribute('data-signature:integrity', signatureIntegrity);
    }

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [amountInCents, currency, publicKey, reference, redirectUrl, signatureIntegrity]);

  if (!publicKey) {
    return (
      <div className="checkout-warning">
        Falta configurar <strong>VITE_WOMPI_PUBLIC_KEY</strong> para activar el sandbox.
      </div>
    );
  }

  return <div ref={containerRef} className="checkout-wompi-container" />;
}

export default function CheckoutPage({ user, cartItems, onBackToCatalog }) {
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [reference] = useState(() => wompiReference());

  useEffect(() => {
    let active = true;

    fetchMyAddresses()
      .then((rows) => {
        if (!active) return;
        setAddresses(rows);
        const principal = rows.find((row) => row.es_principal) || rows[0] || null;
        setSelectedAddressId(principal ? String(principal.id) : '');
      })
      .catch(() => {
        if (active) setAddresses([]);
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.precio * item.quantity, 0),
    [cartItems]
  );

  const shipping = subtotal >= 400 ? 0 : 180;
  const total = subtotal + shipping;

  const selectedAddress = addresses.find((row) => String(row.id) === selectedAddressId) || null;

  const wompiPublicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY || '';
  const wompiCurrency = import.meta.env.VITE_WOMPI_CURRENCY || 'COP';
  const wompiSignatureIntegrity = import.meta.env.VITE_WOMPI_SIGNATURE_INTEGRITY || '';
  const wompiRedirectUrl = import.meta.env.VITE_WOMPI_REDIRECT_URL || `${window.location.origin}/mi-cuenta`;
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_SALES_NUMBER || '573002454123';

  const whatsappMessage = useMemo(
    () => buildWhatsappMessage({ user, cartItems, total, address: selectedAddress, reference }),
    [cartItems, reference, selectedAddress, total, user]
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  const canCheckout = cartItems.length > 0;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canCheckout) {
    return <Navigate to="/catalogo" replace />;
  }

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <section className="checkout-hero">
          <div>
            <p className="checkout-kicker">Checkout Azami</p>
            <h1 className="checkout-title">Confirma tu pedido y elige cómo continuar</h1>
            <p className="checkout-subtitle">
              Preparamos un flujo de compra realista: pago en sandbox con Wompi y confirmación por WhatsApp con el detalle exacto de tu carrito.
            </p>
          </div>
          <div className="checkout-reference-card">
            <span>Referencia</span>
            <strong>{reference}</strong>
          </div>
        </section>

        <section className="checkout-grid">
          <div className="checkout-main-col">
            <div className="checkout-card">
              <div className="checkout-card-heading">
                <h2>Tu carrito</h2>
                <Link to="/mi-cuenta" className="checkout-link">Editar en mi cuenta</Link>
              </div>

              <ul className="checkout-item-list">
                {cartItems.map((item) => (
                  <li key={item.id} className="checkout-item">
                    <img src={item.imagen_url} alt={item.nombre} className="checkout-item-img" loading="lazy" />
                    <div className="checkout-item-copy">
                      <strong>{item.nombre}</strong>
                      <span>{item.tono}</span>
                      <span>Cantidad: {item.quantity}</span>
                    </div>
                    <strong className="checkout-item-price">{formatPrice(item.precio * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="checkout-card">
              <div className="checkout-card-heading">
                <h2>Dirección de envío</h2>
                <Link to="/mi-cuenta" className="checkout-link">Actualizar direcciones</Link>
              </div>

              {addressesLoading ? (
                <p className="checkout-muted">Cargando tus direcciones guardadas…</p>
              ) : addresses.length > 0 ? (
                <div className="checkout-address-list">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      className={`checkout-address-card ${selectedAddressId === String(address.id) ? 'is-active' : ''}`}
                      onClick={() => setSelectedAddressId(String(address.id))}
                    >
                      <strong>{address.alias}</strong>
                      <span>{address.nombre_receptor}</span>
                      <span>{address.calle}</span>
                      <span>{address.ciudad}, {address.estado}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="checkout-empty-inline">
                  No tienes direcciones guardadas todavía.
                  <Link to="/mi-cuenta" className="checkout-link">Añadir una dirección</Link>
                </div>
              )}
            </div>
          </div>

          <aside className="checkout-aside">
            <div className="checkout-card checkout-summary-card">
              <h2>Resumen</h2>

              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className="checkout-summary-row">
                <span>Envío</span>
                <strong>{shipping === 0 ? 'Gratis' : formatPrice(shipping)}</strong>
              </div>
              <div className="checkout-summary-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <div className="checkout-preview">
                <span>Mensaje WhatsApp</span>
                <p>{buildCartLines(cartItems)}</p>
              </div>

              <div className="checkout-actions">
                <WompiSandboxWidget
                  amountInCents={Math.round(total * 100)}
                  reference={reference}
                  currency={wompiCurrency}
                  publicKey={wompiPublicKey}
                  signatureIntegrity={wompiSignatureIntegrity}
                  redirectUrl={wompiRedirectUrl}
                />

                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="checkout-btn checkout-btn-whatsapp">
                  Enviar pedido por WhatsApp
                </a>

                <button type="button" className="checkout-btn checkout-btn-secondary" onClick={onBackToCatalog}>
                  Seguir explorando
                </button>
              </div>

              <p className="checkout-footnote">
                Wompi funciona en sandbox cuando configures las variables de entorno. El enlace de WhatsApp usa el resumen real del carrito y la dirección seleccionada.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}