import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { createGuestOrder, createMyOrder, fetchMyAddresses, fetchWompiWidgetConfig } from '../api';
import { FREE_SHIPPING_THRESHOLD_COP, STANDARD_SHIPPING_FEE_COP, STORE_CURRENCY, formatPrice, normalizePrice } from '../utils/pricing.js';
import './CheckoutPage.css';

const initialGuestForm = {
  nombre: '',
  email: '',
  telefono: '',
  nombre_receptor: '',
  alias: 'Entrega',
  calle: '',
  ciudad: '',
  estado: '',
  codigo_postal: '',
  pais: 'Colombia',
  acceptTerms: false,
  acceptDataPolicy: false,
};

function buildCartLines(cartItems) {
  return cartItems.map((item) => `${item.quantity}x ${item.nombre}`).join(' | ');
}

function buildWhatsappMessage({ user, customer, cartItems, total, address, reference }) {
  const customerName = customer?.name || user?.name || 'un cliente';
  const recipientName = address?.nombre_receptor || customerName;
  const addressLine = address
    ? [address.calle, `${address.ciudad}, ${address.estado}`, address.codigo_postal, address.pais].filter(Boolean).join(', ')
    : 'Pendiente por confirmar';

  return [
    `Hola, soy ${customerName} y quiero confirmar mi pedido Azami ${reference}.`,
    customer?.email ? `Correo: ${customer.email}.` : null,
    customer?.phone ? `Teléfono: ${customer.phone}.` : null,
    `Productos: ${buildCartLines(cartItems)}.`,
    `Total estimado: ${formatPrice(total)}.`,
    `Recibe: ${recipientName}.`,
    `Dirección de envío: ${addressLine}.`,
    '¿Me pueden ayudar a validar disponibilidad y tiempos de entrega?',
  ].filter(Boolean).join('\n');
}

function wompiReference() {
  return `AZAMI-${Date.now().toString(36).toUpperCase()}`;
}

function extractBackendProductId(item) {
  const directId = Number(item?.productId);
  if (Number.isInteger(directId) && directId > 0) {
    return directId;
  }

  if (typeof item?.id === 'string' && item.id.startsWith('remote-')) {
    const parsed = Number(item.id.slice('remote-'.length));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const fallback = Number(item?.id);
  return Number.isInteger(fallback) && fallback > 0 ? fallback : null;
}

function toWompiCountryCode(country) {
  const normalized = String(country || '').trim().toUpperCase();
  if (!normalized) return 'CO';
  if (normalized === 'COLOMBIA') return 'CO';
  return normalized.slice(0, 2);
}

function WompiSandboxWidget({ config, errorMessage, customerData, shippingAddress }) {
  const containerRef = useRef(null);
  const amountInCents = Number(config?.amountInCents || 0);
  const reference = config?.reference || '';
  const currency = config?.currency || STORE_CURRENCY;
  const publicKey = config?.publicKey || '';
  const signatureIntegrity = config?.signatureIntegrity || '';
  const redirectUrl = config?.redirectUrl || '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !publicKey || !signatureIntegrity || amountInCents <= 0 || !reference) return undefined;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-public-key', publicKey);
    script.setAttribute('data-currency', currency);
    script.setAttribute('data-amount-in-cents', String(amountInCents));
    script.setAttribute('data-reference', reference);
    script.setAttribute('data-signature:integrity', signatureIntegrity);
    if (redirectUrl) {
      script.setAttribute('data-redirect-url', redirectUrl);
    }
    if (customerData?.email) {
      script.setAttribute('data-customer-data:email', customerData.email);
    }
    if (customerData?.fullName) {
      script.setAttribute('data-customer-data:full-name', customerData.fullName);
    }
    if (customerData?.phoneNumber) {
      script.setAttribute('data-customer-data:phone-number', customerData.phoneNumber);
      script.setAttribute('data-customer-data:phone-number-prefix', '+57');
    }
    if (shippingAddress?.addressLine1) {
      script.setAttribute('data-shipping-address:address-line-1', shippingAddress.addressLine1);
      script.setAttribute('data-shipping-address:country', toWompiCountryCode(shippingAddress.country));
      script.setAttribute('data-shipping-address:city', shippingAddress.city || '');
      script.setAttribute('data-shipping-address:phone-number', shippingAddress.phoneNumber || '');
      script.setAttribute('data-shipping-address:region', shippingAddress.region || '');
      script.setAttribute('data-shipping-address:name', shippingAddress.name || '');
      if (shippingAddress?.postalCode) {
        script.setAttribute('data-shipping-address:postal-code', shippingAddress.postalCode);
      }
      if (shippingAddress?.addressLine2) {
        script.setAttribute('data-shipping-address:address-line-2', shippingAddress.addressLine2);
      }
    }

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [amountInCents, currency, publicKey, reference, redirectUrl, signatureIntegrity]);

  if (errorMessage) {
    return (
      <div className="checkout-warning">
        {errorMessage}
      </div>
    );
  }

  if (!publicKey || !signatureIntegrity) {
    return (
      <div className="checkout-warning">
        Configura <strong>WOMPI_PUBLIC_KEY</strong> y <strong>WOMPI_INTEGRITY_SECRET</strong> en el backend para activar el sandbox de Wompi sin exponer secretos en el frontend.
      </div>
    );
  }

  return <div ref={containerRef} className="checkout-wompi-container" />;
}

export default function CheckoutPage({ user, cartItems, onBackToCatalog, onOrderCreated }) {
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [reference] = useState(() => wompiReference());
  const [isCreatingTestOrder, setIsCreatingTestOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [wompiWidgetConfig, setWompiWidgetConfig] = useState(null);
  const [wompiWidgetError, setWompiWidgetError] = useState('');
  const [guestForm, setGuestForm] = useState(() => ({
    ...initialGuestForm,
    nombre: user?.name || '',
    email: user?.email || '',
    nombre_receptor: user?.name || '',
  }));

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setAddressesLoading(false);
      return undefined;
    }

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
  }, [user]);

  useEffect(() => {
    setGuestForm((current) => ({
      ...current,
      nombre: current.nombre || user?.name || '',
      email: current.email || user?.email || '',
      nombre_receptor: current.nombre_receptor || user?.name || '',
    }));
  }, [user]);

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + normalizePrice(item.precio) * item.quantity, 0),
    [cartItems]
  );

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_COP ? 0 : STANDARD_SHIPPING_FEE_COP;
  const total = subtotal + shipping;

  const selectedAddress = user
    ? addresses.find((row) => String(row.id) === selectedAddressId) || null
    : {
        alias: guestForm.alias,
      nombre_receptor: guestForm.nombre_receptor,
        telefono: guestForm.telefono,
        calle: guestForm.calle,
        ciudad: guestForm.ciudad,
        estado: guestForm.estado,
        codigo_postal: guestForm.codigo_postal,
        pais: guestForm.pais,
      };
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_SALES_NUMBER || '573002454123';
  const whatsappCustomer = user
    ? {
        name: user.name,
        email: user.email,
        phone: selectedAddress?.telefono || '',
      }
    : {
        name: guestForm.nombre,
        email: guestForm.email,
        phone: guestForm.telefono,
      };

  const whatsappMessage = useMemo(
    () => buildWhatsappMessage({ user, customer: whatsappCustomer, cartItems, total, address: selectedAddress, reference }),
    [cartItems, reference, selectedAddress, total, user, whatsappCustomer]
  );

  const persistableItems = useMemo(
    () => cartItems.map((item) => ({
      productId: extractBackendProductId(item),
      quantity: Number(item.quantity) || 0,
      nombre: item.nombre,
    })),
    [cartItems]
  );

  const hasUnsupportedItems = persistableItems.some((item) => !item.productId || item.quantity <= 0);
  const guestFieldsCompleted = Boolean(
    guestForm.nombre.trim()
    && guestForm.email.trim()
    && guestForm.telefono.trim()
    && guestForm.nombre_receptor.trim()
    && guestForm.calle.trim()
    && guestForm.ciudad.trim()
    && guestForm.estado.trim()
    && guestForm.codigo_postal.trim()
    && guestForm.acceptTerms
    && guestForm.acceptDataPolicy
  );
  const canCreateTestOrder = (user ? Boolean(selectedAddressId) : guestFieldsCompleted) && !hasUnsupportedItems;
  const canSendWhatsapp = user ? Boolean(selectedAddress) : guestFieldsCompleted;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  const whatsappPreviewMessage = canSendWhatsapp
    ? whatsappMessage
    : 'Completa tus datos de contacto y envío para generar el mensaje que se enviará por WhatsApp.';
  const canCheckout = cartItems.length > 0;
  const amountInCents = Math.round(total * 100);
  const wompiCustomerData = {
    email: user?.email || guestForm.email,
    fullName: user?.name || guestForm.nombre,
    phoneNumber: selectedAddress?.telefono || guestForm.telefono,
  };
  const wompiShippingAddress = selectedAddress
    ? {
        addressLine1: selectedAddress.calle,
        addressLine2: selectedAddress.alias,
        country: selectedAddress.pais,
        city: selectedAddress.ciudad,
        phoneNumber: selectedAddress.telefono,
        region: selectedAddress.estado,
        name: selectedAddress.nombre_receptor,
        postalCode: selectedAddress.codigo_postal,
      }
    : null;

  useEffect(() => {
    let active = true;

    if (!canCheckout || amountInCents <= 0) {
      setWompiWidgetConfig(null);
      setWompiWidgetError('');
      return undefined;
    }

    setWompiWidgetError('');

    fetchWompiWidgetConfig({
      amountInCents,
      currency: STORE_CURRENCY,
      reference,
    })
      .then((config) => {
        if (!active) return;
        setWompiWidgetConfig(config);
      })
      .catch((error) => {
        if (!active) return;
        setWompiWidgetConfig(null);
        setWompiWidgetError(error.message || 'No se pudo preparar Wompi en este momento.');
      });

    return () => {
      active = false;
    };
  }, [amountInCents, canCheckout, reference]);

  function handleGuestFormChange(event) {
    const { name, value, type, checked } = event.target;
    setCheckoutError('');
    setGuestForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleWhatsappOrder() {
    if (!canSendWhatsapp) {
      setCheckoutError(
        user
          ? 'Selecciona una dirección de envío antes de enviar el pedido por WhatsApp.'
          : 'Completa tus datos de contacto, envío y autorizaciones antes de enviar el pedido por WhatsApp.'
      );
      return;
    }

    setCheckoutError('');
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleCreateTestOrder() {
    if (user && !selectedAddressId) {
      setCheckoutError('Selecciona una dirección antes de registrar el pedido de prueba.');
      return;
    }

    if (!user && !guestFieldsCompleted) {
      setCheckoutError('Completa tus datos, la dirección de envío y acepta términos y tratamiento de datos para continuar.');
      return;
    }

    if (hasUnsupportedItems) {
      setCheckoutError('Hay productos del catálogo editorial que no existen en la base de datos. Carga el catálogo conectado para probar el guardado real.');
      return;
    }

    setIsCreatingTestOrder(true);
    setCheckoutError('');

    try {
      const payload = {
        reference,
        paymentProvider: 'mock_local',
        paymentMethod: 'sandbox_local',
        paymentStatus: 'approved',
        items: persistableItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const order = user
        ? await createMyOrder({
            ...payload,
            addressId: Number(selectedAddressId),
          })
        : await createGuestOrder({
            ...payload,
            customer: {
              nombre: guestForm.nombre,
              email: guestForm.email,
              telefono: guestForm.telefono,
            },
            address: {
              alias: guestForm.alias,
              nombre_receptor: guestForm.nombre_receptor,
              telefono: guestForm.telefono,
              calle: guestForm.calle,
              ciudad: guestForm.ciudad,
              estado: guestForm.estado,
              codigo_postal: guestForm.codigo_postal,
              pais: guestForm.pais,
            },
          });

      setCreatedOrder(order);
      onOrderCreated?.(order, { redirectToAccount: Boolean(user) });
    } catch (error) {
      setCheckoutError(error.message || 'No se pudo registrar el pedido de prueba.');
    } finally {
      setIsCreatingTestOrder(false);
    }
  }

  if (createdOrder && !user) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <section className="checkout-success-card checkout-card">
            <p className="checkout-kicker">Pedido registrado</p>
            <h1 className="checkout-title">Tu pedido de prueba quedó guardado</h1>
            <p className="checkout-subtitle">
              Guardamos tu compra como invitado con la referencia <strong>{createdOrder.referencia_pago}</strong>. El siguiente paso será conectar esta misma orden al pago real con Wompi.
            </p>

            <div className="checkout-success-grid">
              <div>
                <span className="checkout-muted">Cliente</span>
                <strong>{createdOrder.cliente_nombre}</strong>
                <p className="checkout-footnote">{createdOrder.cliente_email}</p>
              </div>
              <div>
                <span className="checkout-muted">Total</span>
                <strong>{formatPrice(createdOrder.total)}</strong>
                <p className="checkout-footnote">Estado: {createdOrder.estado}</p>
              </div>
            </div>

            <div className="checkout-actions">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="checkout-btn checkout-btn-whatsapp">
                Enviar pedido por WhatsApp
              </a>
              <button type="button" className="checkout-btn checkout-btn-secondary" onClick={onBackToCatalog}>
                Volver al catálogo
              </button>
              <Link to="/auth" className="checkout-btn checkout-btn-secondary">
                Crear cuenta con este correo
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!canCheckout) {
    return <Navigate to="/catalogo" replace />;
  }

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <section className="checkout-hero">
          <div>
            <p className="checkout-kicker">Pago Azami</p>
            <h1 className="checkout-title">Confirma tu pedido y elige cómo continuar</h1>
            <p className="checkout-subtitle">
              {user
                ? 'Preparamos un flujo de compra realista: pago en sandbox con Wompi y confirmación por WhatsApp con el detalle exacto de tu carrito.'
                : 'Puedes comprar como invitado. Solo necesitamos tus datos de contacto y envío para registrar la orden antes de conectar el pago real.'}
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
                {user ? <Link to="/mi-cuenta" className="checkout-link">Editar en mi cuenta</Link> : <Link to="/catalogo" className="checkout-link">Seguir comprando</Link>}
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
                <h2>{user ? 'Dirección de envío' : 'Datos de contacto y envío'}</h2>
                {user ? <Link to="/mi-cuenta" className="checkout-link">Actualizar direcciones</Link> : <Link to="/auth" className="checkout-link">¿Ya tienes cuenta?</Link>}
              </div>

              {user ? (
                addressesLoading ? (
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
                )
              ) : (
                <div className="checkout-form-grid">
                  <label className="checkout-field">
                    <span>Nombre completo</span>
                    <input type="text" name="nombre" value={guestForm.nombre} onChange={handleGuestFormChange} placeholder="Tu nombre" required />
                  </label>
                  <label className="checkout-field">
                    <span>Correo</span>
                    <input type="email" name="email" value={guestForm.email} onChange={handleGuestFormChange} placeholder="tu@correo.com" required />
                  </label>
                  <label className="checkout-field">
                    <span>Teléfono</span>
                    <input type="tel" name="telefono" value={guestForm.telefono} onChange={handleGuestFormChange} placeholder="3001234567" required />
                  </label>
                  <label className="checkout-field">
                    <span>Quién recibe</span>
                    <input type="text" name="nombre_receptor" value={guestForm.nombre_receptor} onChange={handleGuestFormChange} placeholder="Nombre del receptor" required />
                  </label>
                  <label className="checkout-field checkout-field-wide">
                    <span>Dirección</span>
                    <input type="text" name="calle" value={guestForm.calle} onChange={handleGuestFormChange} placeholder="Calle, carrera, número, apartamento" required />
                  </label>
                  <label className="checkout-field">
                    <span>Ciudad</span>
                    <input type="text" name="ciudad" value={guestForm.ciudad} onChange={handleGuestFormChange} placeholder="Bogotá" required />
                  </label>
                  <label className="checkout-field">
                    <span>Departamento</span>
                    <input type="text" name="estado" value={guestForm.estado} onChange={handleGuestFormChange} placeholder="Cundinamarca" required />
                  </label>
                  <label className="checkout-field">
                    <span>Código postal</span>
                    <input type="text" name="codigo_postal" value={guestForm.codigo_postal} onChange={handleGuestFormChange} placeholder="110111" required />
                  </label>
                  <label className="checkout-field">
                    <span>País</span>
                    <input type="text" name="pais" value={guestForm.pais} onChange={handleGuestFormChange} placeholder="Colombia" required />
                  </label>

                  <label className="checkout-check checkout-field-wide">
                    <input type="checkbox" name="acceptTerms" checked={guestForm.acceptTerms} onChange={handleGuestFormChange} required />
                    <span>Acepto los <Link to="/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</Link>.</span>
                  </label>
                  <label className="checkout-check checkout-field-wide">
                    <input type="checkbox" name="acceptDataPolicy" checked={guestForm.acceptDataPolicy} onChange={handleGuestFormChange} required />
                    <span>Autorizo el tratamiento de datos conforme a la <Link to="/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</Link>.</span>
                  </label>
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
                <span>Mensaje para WhatsApp</span>
                <p>{whatsappPreviewMessage}</p>
              </div>

              {checkoutError ? (
                <div className="checkout-warning">{checkoutError}</div>
              ) : null}

              {user && !selectedAddress && !addressesLoading ? (
                <div className="checkout-warning">Necesitas una dirección guardada para registrar pedidos de prueba.</div>
              ) : null}

              {hasUnsupportedItems ? (
                <div className="checkout-warning">
                  Este carrito contiene productos sin ID real de base de datos. Para validar el guardado de pedidos usa productos del catálogo conectado al backend.
                </div>
              ) : null}

              <div className="checkout-actions">
                <button
                  type="button"
                  className="checkout-btn"
                  onClick={handleCreateTestOrder}
                  disabled={isCreatingTestOrder || !canCreateTestOrder}
                >
                  {isCreatingTestOrder ? 'Guardando pedido de prueba...' : user ? 'Simular pago de prueba' : 'Comprar como invitado'}
                </button>

                <WompiSandboxWidget
                  config={wompiWidgetConfig}
                  errorMessage={wompiWidgetError}
                  customerData={wompiCustomerData}
                  shippingAddress={wompiShippingAddress}
                />

                <button type="button" className="checkout-btn checkout-btn-whatsapp" onClick={handleWhatsappOrder}>
                  Enviar pedido por WhatsApp
                </button>

                <button type="button" className="checkout-btn checkout-btn-secondary" onClick={onBackToCatalog}>
                  Seguir explorando
                </button>
              </div>

              <p className="checkout-footnote">
                {user
                  ? 'El botón de prueba guarda la orden en tu base de datos sin cobrar dinero real. Wompi queda como siguiente paso cuando tengas tu comercio sandbox.'
                  : 'Tu compra invitada ya queda lista para persistirse en base de datos. Luego conectaremos ese mismo flujo con el pago real de Wompi y las notificaciones por correo.'}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}