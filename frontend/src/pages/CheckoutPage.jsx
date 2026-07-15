import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { createGuestOrder, createMyOrder, fetchCheckoutQuote, fetchMyAddresses, fetchWompiTransaction, fetchWompiWidgetConfig } from '../api';
import { STORE_CURRENCY, formatPrice, normalizePrice } from '../utils/pricing.js';
import './CheckoutPage.css';

const WOMPI_CONTEXT_KEY_PREFIX = 'azami-wompi-context:';
const WOMPI_SYNC_KEY_PREFIX = 'azami-wompi-sync:';
const WOMPI_PENDING_KEY_PREFIX = 'azami-wompi-pending:';

function wompiContextKey(reference) {
  return `${WOMPI_CONTEXT_KEY_PREFIX}${reference}`;
}

function wompiSyncKey(transactionId) {
  return `${WOMPI_SYNC_KEY_PREFIX}${transactionId}`;
}

function wompiPendingKey(reference) {
  return `${WOMPI_PENDING_KEY_PREFIX}${reference}`;
}

function saveWompiContext(reference, context) {
  if (typeof window === 'undefined' || !reference) return;

  const payload = JSON.stringify({ ...context, savedAt: Date.now() });
  const key = wompiContextKey(reference);
  window.sessionStorage.setItem(key, payload);
  window.localStorage.setItem(key, payload);
}

function readWompiContext(reference) {
  if (typeof window === 'undefined' || !reference) return null;
  const key = wompiContextKey(reference);
  const raw = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readLatestWompiContext() {
  if (typeof window === 'undefined') return null;

  const contexts = [];

  const collect = (storage) => {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(WOMPI_CONTEXT_KEY_PREFIX)) continue;

      const raw = storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        contexts.push(parsed);
      } catch {
        // Ignore malformed payloads.
      }
    }
  };

  collect(window.sessionStorage);
  collect(window.localStorage);

  if (!contexts.length) return null;

  contexts.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  return contexts[0] || null;
}

function clearWompiContext(reference) {
  if (typeof window === 'undefined' || !reference) return;
  const key = wompiContextKey(reference);
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function isWompiSynced(transactionId) {
  if (typeof window === 'undefined' || !transactionId) return false;
  return window.sessionStorage.getItem(wompiSyncKey(transactionId)) === '1';
}

function markWompiSynced(transactionId) {
  if (typeof window === 'undefined' || !transactionId) return;
  window.sessionStorage.setItem(wompiSyncKey(transactionId), '1');
}

function isWompiPendingPrepared(reference) {
  if (typeof window === 'undefined' || !reference) return false;
  return window.sessionStorage.getItem(wompiPendingKey(reference)) === '1';
}

function markWompiPendingPrepared(reference) {
  if (typeof window === 'undefined' || !reference) return;
  window.sessionStorage.setItem(wompiPendingKey(reference), '1');
}

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

function formatOrderStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'pago_confirmado' || normalized === 'confirmado' || normalized === 'pagado') {
    return 'Pago confirmado';
  }

  if (normalized === 'pendiente') return 'Pendiente';
  if (normalized === 'enviado') return 'Enviado';
  if (normalized === 'entregado') return 'Entregado';
  if (normalized === 'cancelado') return 'Pago cancelado';

  return status || 'Registrado';
}

function WompiSandboxTestGuide() {
  return (
    <div className="checkout-sandbox-guide" role="note" aria-label="Datos de prueba Wompi Sandbox">
      <p className="checkout-sandbox-title">Datos de prueba Wompi Sandbox</p>
      <p className="checkout-sandbox-subtitle">Usa estos datos oficiales en el widget para simular estados.</p>

      <div className="checkout-sandbox-grid">
        <div>
          <strong>Tarjetas</strong>
          <ul>
            <li>4242 4242 4242 4242: APPROVED</li>
            <li>4111 1111 1111 1111: DECLINED</li>
            <li>Cualquier otra tarjeta: ERROR</li>
            <li>Fecha futura y CVC de 3 digitos</li>
          </ul>
        </div>

        <div>
          <strong>Nequi</strong>
          <ul>
            <li>3991111111: APPROVED</li>
            <li>3992222222: DECLINED</li>
            <li>Otro numero: ERROR</li>
          </ul>
        </div>

        <div>
          <strong>PSE (Widget)</strong>
          <ul>
            <li>Banco que aprueba: APPROVED</li>
            <li>Banco que rechaza: DECLINED</li>
          </ul>
        </div>

        <div>
          <strong>Boton Bancolombia</strong>
          <ul>
            <li>En la redireccion eliges el estado final</li>
            <li>APPROVED / DECLINED</li>
          </ul>
        </div>

        <div>
          <strong>Bancolombia QR</strong>
          <ul>
            <li>En el widget eliges el estado final</li>
            <li>APROBADA / DECLINADA / ERROR</li>
          </ul>
        </div>

        <div>
          <strong>Daviplata</strong>
          <ul>
            <li>OTP 574829: APPROVED</li>
            <li>OTP 932015: DECLINED</li>
            <li>OTP 999999: ERROR</li>
          </ul>
        </div>

        <div>
          <strong>Puntos Colombia</strong>
          <ul>
            <li>En el widget eliges el estado final</li>
            <li>Pago total o 50% con puntos</li>
          </ul>
        </div>

        <div>
          <strong>BNPL Bancolombia</strong>
          <ul>
            <li>En la redireccion eliges el estado final</li>
            <li>APPROVED / DECLINED / ERROR</li>
          </ul>
        </div>

        <div>
          <strong>Su+ Pay</strong>
          <ul>
            <li>En la redireccion eliges el estado final</li>
            <li>APPROVED / DECLINED / ERROR</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function WompiSandboxWidget({ config, errorMessage, customerData, shippingAddress, onBeforeOpen, isPreparing }) {
  const amountInCents = Number(config?.amountInCents || 0);
  const reference = config?.reference || '';
  const currency = config?.currency || STORE_CURRENCY;
  const publicKey = config?.publicKey || '';
  const signatureIntegrity = config?.signatureIntegrity || '';
  const redirectUrl = config?.redirectUrl || '';

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

  const params = new URLSearchParams();
  params.set('mode', 'widget');
  params.set('public-key', publicKey);
  params.set('currency', currency);
  params.set('amount-in-cents', String(amountInCents));
  params.set('reference', reference);
  params.set('widget-operation', 'purchase');
  params.set('signature:integrity', signatureIntegrity);
  if (redirectUrl) {
    params.set('redirect-url', redirectUrl);
  }

  const customerEmail = String(customerData?.email || '').trim();
  const customerFullName = String(customerData?.fullName || '').trim();
  const customerPhoneNumber = String(customerData?.phoneNumber || '').trim();
  if (customerEmail) params.set('customer-data:email', customerEmail);
  if (customerFullName) params.set('customer-data:full-name', customerFullName);
  if (customerPhoneNumber) {
    params.set('customer-data:phone-number', customerPhoneNumber);
    params.set('customer-data:phone-number-prefix', '+57');
  }

  const addressLine1 = String(shippingAddress?.addressLine1 || '').trim();
  if (addressLine1) {
    params.set('shipping-address:address-line-1', addressLine1);
    params.set('shipping-address:country', toWompiCountryCode(shippingAddress?.country));
    params.set('shipping-address:city', String(shippingAddress?.city || '').trim());
    params.set('shipping-address:phone-number', String(shippingAddress?.phoneNumber || '').trim());
    params.set('shipping-address:region', String(shippingAddress?.region || '').trim());
    params.set('shipping-address:name', String(shippingAddress?.name || '').trim());

    const postalCode = String(shippingAddress?.postalCode || '').trim();
    const addressLine2 = String(shippingAddress?.addressLine2 || '').trim();
    if (postalCode) params.set('shipping-address:postal-code', postalCode);
    if (addressLine2) params.set('shipping-address:address-line-2', addressLine2);
  }

  const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

  async function handleOpenCheckout() {
    if (typeof onBeforeOpen === 'function') {
      const ready = await onBeforeOpen();
      if (!ready) {
        return;
      }
    }

    if (typeof window !== 'undefined') {
      window.location.assign(checkoutUrl);
    }
  }

  return (
    <button type="button" className="checkout-btn checkout-btn-wompi" onClick={handleOpenCheckout} disabled={Boolean(isPreparing)}>
      {isPreparing ? 'Preparando pago...' : 'Pagar con Wompi'}
    </button>
  );
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
  const [isPreparingWompiOrder, setIsPreparingWompiOrder] = useState(false);
  const [wompiReturn, setWompiReturn] = useState(null);
  const [quoteSummary, setQuoteSummary] = useState(null);
  const wompiSyncStartedRef = useRef(false);
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

  const rawSubtotal = useMemo(
    () => cartItems.reduce((total, item) => total + normalizePrice(item.precio) * item.quantity, 0),
    [cartItems]
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

  useEffect(() => {
    let active = true;

    const filteredItems = persistableItems
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({ productId: item.productId, quantity: item.quantity }));

    if (!filteredItems.length || hasUnsupportedItems) {
      setQuoteSummary(null);
      return undefined;
    }

    fetchCheckoutQuote({
      items: filteredItems,
      email: user?.email || guestForm.email,
    })
      .then((quote) => {
        if (!active) return;
        setQuoteSummary(quote);
      })
      .catch(() => {
        if (!active) return;
        setQuoteSummary(null);
      });

    return () => {
      active = false;
    };
  }, [guestForm.email, hasUnsupportedItems, persistableItems, user?.email]);

  const subtotal = Number(quoteSummary?.subtotal ?? rawSubtotal ?? 0);
  const discountTotal = Number(quoteSummary?.descuento_total || 0);
  const shipping = Number(quoteSummary?.envio || 0);
  const total = Number(quoteSummary?.total ?? subtotal + shipping);
  const appliedDiscountRule = quoteSummary?.descuento_regla || null;

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
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_SALES_NUMBER || '573004651366';
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
  const wompiPrereqMessage = user
    ? (!selectedAddress || !wompiCustomerData.email || !wompiCustomerData.fullName || !wompiCustomerData.phoneNumber
      ? 'Completa tus datos de perfil y selecciona una dirección para habilitar Wompi.'
      : '')
    : (!guestFieldsCompleted
      ? 'Completa tus datos de contacto, envío y autorizaciones para habilitar Wompi.'
      : '');

  const wompiReturnTransactionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return String(params.get('id') || params.get('transaction_id') || '').trim();
  }, []);
  const hasWompiReturnTransaction = Boolean(wompiReturnTransactionId);

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

  useEffect(() => {
    if (!wompiWidgetConfig?.reference || !Number.isInteger(amountInCents) || amountInCents <= 0 || hasUnsupportedItems) {
      return;
    }

    const filteredItems = persistableItems
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({ productId: item.productId, quantity: item.quantity }));

    if (!filteredItems.length) {
      return;
    }

    const context = user
      ? {
          mode: 'registered',
          reference: wompiWidgetConfig.reference,
          amountInCents,
          items: filteredItems,
          addressId: Number(selectedAddressId) || null,
        }
      : {
          mode: 'guest',
          reference: wompiWidgetConfig.reference,
          amountInCents,
          items: filteredItems,
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
        };

    saveWompiContext(wompiWidgetConfig.reference, context);
  }, [
    amountInCents,
    guestForm.alias,
    guestForm.calle,
    guestForm.ciudad,
    guestForm.codigo_postal,
    guestForm.email,
    guestForm.estado,
    guestForm.nombre,
    guestForm.nombre_receptor,
    guestForm.pais,
    guestForm.telefono,
    hasUnsupportedItems,
    persistableItems,
    selectedAddressId,
    user,
    wompiWidgetConfig,
  ]);

  useEffect(() => {
    if (!wompiReturnTransactionId || wompiSyncStartedRef.current) {
      return;
    }

    wompiSyncStartedRef.current = true;

    function cleanReturnUrl() {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    async function syncApprovedTransaction() {
      setWompiReturn({ status: 'syncing', transactionId: wompiReturnTransactionId });
      setCheckoutError('');

      try {
        let transaction = await fetchWompiTransaction(wompiReturnTransactionId);

        // Métodos asíncronos (Bancolombia Transfer/QR, BNPL, Su+ Pay) pueden
        // volver momentáneamente en estado pendiente tras el redirect. Reintentamos
        // unas cuantas veces antes de decidir el resultado final.
        for (let attempt = 0; attempt < 5 && transaction.status === 'pending'; attempt += 1) {
          await new Promise((resolve) => { setTimeout(resolve, 2500); });
          transaction = await fetchWompiTransaction(wompiReturnTransactionId);
        }

        if (transaction.status === 'pending') {
          setWompiReturn({
            status: 'pending',
            transactionId: wompiReturnTransactionId,
            transaction,
            message: 'Tu pago está siendo procesado por Wompi. Te avisaremos cuando se confirme.',
          });
          return;
        }

        if (transaction.status !== 'approved') {
          setWompiReturn({
            status: 'error',
            transactionId: wompiReturnTransactionId,
            transaction,
            message: `Wompi reporta la transacción como ${transaction.rawStatus || transaction.status}.`,
          });
          return;
        }

        if (isWompiSynced(wompiReturnTransactionId)) {
          cleanReturnUrl();
          setWompiReturn({ status: 'already', transactionId: wompiReturnTransactionId, transaction });
          return;
        }

        if (!transaction.reference) {
          throw new Error('Wompi no devolvió referencia para esta transacción.');
        }

        let context = readWompiContext(transaction.reference);

        if (!context) {
          context = readLatestWompiContext();
        }

        if (!context) {
          throw new Error('No encontramos el contexto del checkout para esta referencia. Intenta de nuevo desde el checkout.');
        }

        if (Number(transaction.amountInCents) !== Number(context.amountInCents)) {
          throw new Error('El monto aprobado en Wompi no coincide con el checkout local.');
        }

        const payload = {
          reference: transaction.reference,
          paymentProvider: 'wompi',
          paymentMethod: 'widget',
          paymentStatus: 'approved',
          items: context.items,
        };

        const order = context.mode === 'registered'
          ? await createMyOrder({ ...payload, addressId: Number(context.addressId) || 0 })
          : await createGuestOrder({
              ...payload,
              customer: context.customer,
              address: context.address,
            });

        markWompiSynced(wompiReturnTransactionId);
        clearWompiContext(transaction.reference);
        setCreatedOrder(order);
        onOrderCreated?.(order, { redirectToAccount: false });
        cleanReturnUrl();
        setWompiReturn({ status: 'success', transactionId: wompiReturnTransactionId, transaction, order });
      } catch (error) {
        if (String(error?.message || '').toLowerCase().includes('ya existe')) {
          markWompiSynced(wompiReturnTransactionId);
          cleanReturnUrl();
          setWompiReturn({ status: 'already', transactionId: wompiReturnTransactionId });
          return;
        }

        setWompiReturn({
          status: 'error',
          transactionId: wompiReturnTransactionId,
          message: error.message || 'No se pudo sincronizar el pago de Wompi con la base de datos.',
        });
      }
    }

    syncApprovedTransaction();
  }, [onOrderCreated, user, wompiReturnTransactionId]);

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

  async function handleBeforeWompiCheckout() {
    if (!wompiWidgetConfig?.reference) {
      setCheckoutError('No pudimos preparar la referencia de Wompi. Intenta recargar el checkout.');
      return false;
    }

    if (isPreparingWompiOrder) {
      return false;
    }

    if (user && !selectedAddressId) {
      setCheckoutError('Selecciona una dirección antes de continuar con Wompi.');
      return false;
    }

    if (!user && !guestFieldsCompleted) {
      setCheckoutError('Completa tus datos, dirección y autorizaciones antes de continuar con Wompi.');
      return false;
    }

    if (hasUnsupportedItems) {
      setCheckoutError('Hay productos sin ID de base de datos. Usa el catálogo conectado para pagar con Wompi.');
      return false;
    }

    if (isWompiPendingPrepared(wompiWidgetConfig.reference)) {
      return true;
    }

    setIsPreparingWompiOrder(true);
    setCheckoutError('');

    try {
      const basePayload = {
        reference: wompiWidgetConfig.reference,
        paymentProvider: 'wompi',
        paymentMethod: 'wompi_widget',
        paymentStatus: 'pending',
        items: persistableItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      if (user) {
        await createMyOrder({
          ...basePayload,
          addressId: Number(selectedAddressId),
        });
      } else {
        await createGuestOrder({
          ...basePayload,
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
      }

      markWompiPendingPrepared(wompiWidgetConfig.reference);
      return true;
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();

      if (message.includes('ya existe')) {
        markWompiPendingPrepared(wompiWidgetConfig.reference);
        return true;
      }

      setCheckoutError(error.message || 'No se pudo preparar la orden en estado pendiente antes de abrir Wompi.');
      return false;
    } finally {
      setIsPreparingWompiOrder(false);
    }
  }

  if (wompiReturn) {
    const returnTx = wompiReturn.transaction;
    const returnOrder = wompiReturn.order || createdOrder;
    const returnReference = returnTx?.reference || returnOrder?.referencia_pago || '—';
    const returnAmount = returnTx?.amountInCents != null
      ? formatPrice(Number(returnTx.amountInCents) / 100)
      : returnOrder?.total != null
        ? formatPrice(returnOrder.total)
        : null;
    const isSyncing = wompiReturn.status === 'syncing';
    const isError = wompiReturn.status === 'error';
    const isPending = wompiReturn.status === 'pending';
    const isSuccess = wompiReturn.status === 'success' || wompiReturn.status === 'already';
    const receiptDate = returnTx?.finalizedAt
      ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(returnTx.finalizedAt))
      : returnOrder?.createdAt
        ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(returnOrder.createdAt))
        : new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

    const orderItems = returnOrder?.items || [];
    const address = returnOrder?.direccion_envio || null;
    const subtotal = returnOrder?.subtotal ?? returnOrder?.total ?? null;
    const descuento = returnOrder?.descuento_total ?? 0;
    const envio = returnOrder?.envio ?? 0;

    if (!isSuccess) {
      return (
        <main className="checkout-page">
          <div className="checkout-shell">
            <section className="checkout-success-card checkout-card">
              <p className="checkout-kicker">
                {isSyncing ? 'Procesando pago' : isError ? 'Pago sin confirmar' : 'Pago en proceso'}
              </p>
              <h1 className="checkout-title">
                {isSyncing ? 'Confirmando tu pago con Wompi…'
                  : isError ? 'No pudimos confirmar tu pago'
                  : 'Tu pago está siendo procesado'}
              </h1>
              <p className="checkout-subtitle">
                {isSyncing
                  ? 'Validando la transacción de Wompi y guardando tu orden…'
                  : wompiReturn.message || (isError ? 'Ocurrió un problema al sincronizar el pago.' : 'Te avisaremos cuando se confirme.')}
              </p>
              {isSyncing ? <div className="checkout-warning">Validando pago de Wompi y guardando la orden…</div> : null}
              {!isSyncing ? (
                <div className="checkout-actions">
                  <button type="button" className="checkout-btn" onClick={onBackToCatalog}>Volver al catálogo</button>
                </div>
              ) : null}
            </section>
          </div>
        </main>
      );
    }

    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <section className="checkout-receipt">

            {/* ── Cabecera ── */}
            <div className="checkout-receipt-header">
              <div className="checkout-receipt-status">
                <span className="checkout-receipt-icon" aria-hidden="true">✓</span>
                <div>
                  <p className="checkout-kicker">Comprobante de pago</p>
                  <h1 className="checkout-title">¡Pago aprobado!</h1>
                </div>
              </div>
              <button
                type="button"
                className="checkout-receipt-print"
                onClick={() => window.print()}
                aria-label="Imprimir recibo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
            </div>

            {/* ── Barra de referencia ── */}
            <div className="checkout-receipt-meta">
              <div>
                <span>Referencia</span>
                <strong>{returnReference}</strong>
              </div>
              {returnOrder?.id ? (
                <div>
                  <span>Pedido</span>
                  <strong>#{returnOrder.id}</strong>
                </div>
              ) : null}
              <div>
                <span>Fecha</span>
                <strong>{receiptDate}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong className="checkout-receipt-approved">Aprobado ✓</strong>
              </div>
            </div>

            {/* ── Cuerpo del recibo ── */}
            <div className="checkout-receipt-body">

              {/* columna izquierda */}
              <div className="checkout-receipt-col">

                {orderItems.length > 0 ? (
                  <div className="checkout-receipt-section">
                    <h2 className="checkout-receipt-section-title">Productos</h2>
                    <ul className="checkout-receipt-items">
                      {orderItems.map((item, idx) => (
                        <li key={item.productId ?? idx} className="checkout-receipt-item">
                          <span className="checkout-receipt-item-qty">{item.quantity}×</span>
                          <span className="checkout-receipt-item-name">{item.nombre || `Producto #${item.productId}`}</span>
                          <span className="checkout-receipt-item-price">{formatPrice(item.subtotal ?? item.precio_unitario * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {returnOrder?.cliente_nombre ? (
                  <div className="checkout-receipt-section">
                    <h2 className="checkout-receipt-section-title">Cliente</h2>
                    <p className="checkout-receipt-data">{returnOrder.cliente_nombre}</p>
                    {returnOrder.cliente_email ? <p className="checkout-receipt-data checkout-muted">{returnOrder.cliente_email}</p> : null}
                    {returnOrder.cliente_telefono ? <p className="checkout-receipt-data checkout-muted">{returnOrder.cliente_telefono}</p> : null}
                  </div>
                ) : null}
              </div>

              {/* columna derecha */}
              <div className="checkout-receipt-col">

                <div className="checkout-receipt-section">
                  <h2 className="checkout-receipt-section-title">Resumen del pago</h2>
                  <div className="checkout-receipt-totals">
                    {subtotal != null ? (
                      <div className="checkout-receipt-total-row">
                        <span>Subtotal</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                    ) : null}
                    {Number(descuento || 0) > 0 ? (
                      <div className="checkout-receipt-total-row">
                        <span>Descuento</span>
                        <span>-{formatPrice(descuento)}</span>
                      </div>
                    ) : null}
                    <div className="checkout-receipt-total-row">
                      <span>Envío</span>
                      <span>{envio === 0 ? 'Gratis' : formatPrice(envio)}</span>
                    </div>
                    <div className="checkout-receipt-total-row is-total">
                      <span>Total pagado</span>
                      <span>{returnAmount || '—'}</span>
                    </div>
                  </div>
                </div>

                {wompiReturn.transactionId ? (
                  <div className="checkout-receipt-section">
                    <h2 className="checkout-receipt-section-title">Transacción Wompi</h2>
                    <p className="checkout-receipt-data checkout-muted" style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                      {wompiReturn.transactionId}
                    </p>
                  </div>
                ) : null}

                {address ? (
                  <div className="checkout-receipt-section">
                    <h2 className="checkout-receipt-section-title">Dirección de envío</h2>
                    {address.nombre_receptor ? <p className="checkout-receipt-data">{address.nombre_receptor}</p> : null}
                    {address.calle ? <p className="checkout-receipt-data checkout-muted">{address.calle}</p> : null}
                    {(address.ciudad || address.estado) ? (
                      <p className="checkout-receipt-data checkout-muted">
                        {[address.ciudad, address.estado, address.codigo_postal].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {address.pais ? <p className="checkout-receipt-data checkout-muted">{address.pais}</p> : null}
                  </div>
                ) : null}

              </div>
            </div>

            {/* ── Acciones ── */}
            <div className="checkout-receipt-footer">
              <button type="button" className="checkout-btn checkout-btn-wompi" onClick={onBackToCatalog}>
                Volver al comercio
              </button>
              {user ? (
                <Link to="/mi-cuenta" className="checkout-btn checkout-btn-secondary">
                  Ver mis pedidos
                </Link>
              ) : (
                <Link to="/auth" className="checkout-btn checkout-btn-secondary">
                  Crear cuenta
                </Link>
              )}
            </div>

          </section>
        </div>
      </main>
    );
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
                <p className="checkout-footnote">Estado: {formatOrderStatusLabel(createdOrder.estado)}</p>
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

  if (!canCheckout && !hasWompiReturnTransaction) {
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
              {discountTotal > 0 ? (
                <div className="checkout-summary-row">
                  <span>Descuento{appliedDiscountRule?.nombre ? ` (${appliedDiscountRule.nombre})` : ''}</span>
                  <strong>-{formatPrice(discountTotal)}</strong>
                </div>
              ) : null}
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
                <WompiSandboxWidget
                  config={wompiWidgetConfig}
                  errorMessage={wompiPrereqMessage || wompiWidgetError}
                  customerData={wompiCustomerData}
                  shippingAddress={wompiShippingAddress}
                  onBeforeOpen={handleBeforeWompiCheckout}
                  isPreparing={isPreparingWompiOrder}
                />

                <WompiSandboxTestGuide />

                <button type="button" className="checkout-btn checkout-btn-whatsapp" onClick={handleWhatsappOrder}>
                  Enviar pedido por WhatsApp
                </button>

                <button type="button" className="checkout-btn checkout-btn-secondary" onClick={onBackToCatalog}>
                  Seguir explorando
                </button>
              </div>

              <p className="checkout-footnote">
                {user
                  ? 'Al continuar con Wompi tu orden queda registrada y el pago se procesa de forma segura.'
                  : 'Puedes comprar sin cuenta. Al continuar con Wompi tu orden queda registrada con tus datos de contacto.'}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}