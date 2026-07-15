import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  changePassword,
  createAddress,
  deleteAddressApi,
  fetchMyAddresses,
  fetchMyOrders,
  fetchMyProfile,
  updateAddressApi,
  updateMyProfile,
} from '../api';
import { formatPrice, normalizePrice } from '../utils/pricing.js';
import './UserAccountPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function StatusBadge({ estado }) {
  const map = {
    pendiente: { label: 'Pendiente', cls: 'status-pending' },
    pago_confirmado: { label: 'Pago confirmado', cls: 'status-confirmed' },
    confirmado: { label: 'Pago confirmado', cls: 'status-confirmed' },
    pagado: { label: 'Pago confirmado', cls: 'status-confirmed' },
    enviado: { label: 'Enviado', cls: 'status-shipped' },
    entregado: { label: 'Entregado', cls: 'status-delivered' },
    cancelado: { label: 'Pago cancelado', cls: 'status-cancelled' },
  };
  const s = map[estado] || { label: estado, cls: 'status-pending' };
  return <span className={`acct-status-badge ${s.cls}`}>{s.label}</span>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ type }) {
  const props = { className: 'acct-icon', viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': 'true' };
  switch (type) {
    case 'grid':    return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>;
    case 'box':     return <svg {...props}><path d="M21 8L12 3L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 8V16L12 21L3 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 21V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M3 8L12 13L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'heart':   return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'cart':    return <svg {...props}><path d="M4 6H6L8.2 16.2C8.29 16.65 8.63 17 9.08 17H17.55C17.98 17 18.35 16.7 18.45 16.28L20 9H7.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.35" fill="currentColor"/><circle cx="17" cy="20" r="1.35" fill="currentColor"/></svg>;
    case 'user':    return <svg {...props}><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case 'map':     return <svg {...props}><path d="M12 22S5 15.5 5 10a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>;
    case 'lock':    return <svg {...props}><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case 'check':   return <svg {...props}><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'trash':   return <svg {...props}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'edit':    return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'plus':    return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
    case 'star':    return <svg {...props}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'eye':     return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>;
    case 'eyeOff':  return <svg {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    default:        return null;
  }
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'resumen',      label: 'Resumen',      icon: 'grid' },
  { id: 'pedidos',      label: 'Mis pedidos',  icon: 'box' },
  { id: 'favoritos',    label: 'Favoritos',    icon: 'heart' },
  { id: 'carrito',      label: 'Carrito',      icon: 'cart' },
  { id: 'direcciones',  label: 'Direcciones',  icon: 'map' },
  { id: 'perfil',       label: 'Mi perfil',    icon: 'user' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="acct-empty">
      <span className="acct-empty-icon"><Icon type={icon} /></span>
      <h3 className="acct-empty-title">{title}</h3>
      {subtitle && <p className="acct-empty-sub">{subtitle}</p>}
      {action}
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="acct-loader" aria-label="Cargando…">
      <span className="acct-spinner" />
    </div>
  );
}

// ─── Tab: Resumen ─────────────────────────────────────────────────────────────

function TabResumen({ user, orders, wishlistIds, cartItems, ordersLoading }) {
  const recent = orders.slice(0, 3);
  const memberSince = user?.creado_at ? formatDate(user.creado_at) : null;
  const inProcessCount = orders.filter((order) => {
    const status = String(order.estado || '').trim().toLowerCase();
    return ['pendiente', 'pago_confirmado', 'confirmado', 'pagado'].includes(status);
  }).length;

  return (
    <div className="acct-tab-content">
      <div className="acct-welcome-banner">
        <div className="acct-welcome-avatar" aria-hidden="true">
          {(user?.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="acct-welcome-name">Hola, {user?.name} 👋</h2>
          <p className="acct-welcome-sub">
            {memberSince ? `Miembro desde ${memberSince}` : 'Bienvenida a tu portal personal de Azami'}
          </p>
        </div>
      </div>

      <div className="acct-stats-grid">
        <div className="acct-stat-card">
          <span className="acct-stat-value">{ordersLoading ? '…' : orders.length}</span>
          <span className="acct-stat-label">Pedidos totales</span>
        </div>
        <div className="acct-stat-card">
          <span className="acct-stat-value">{ordersLoading ? '…' : inProcessCount}</span>
          <span className="acct-stat-label">En proceso</span>
        </div>
        <div className="acct-stat-card">
          <span className="acct-stat-value">{wishlistIds.length}</span>
          <span className="acct-stat-label">En favoritos</span>
        </div>
        <div className="acct-stat-card">
          <span className="acct-stat-value">{cartItems.reduce((t, i) => t + i.quantity, 0)}</span>
          <span className="acct-stat-label">En carrito</span>
        </div>
      </div>

      {ordersLoading ? (
        <SectionLoader />
      ) : recent.length > 0 ? (
        <div className="acct-section">
          <h3 className="acct-section-title">Pedidos recientes</h3>
          <div className="acct-order-list">
            {recent.map((order) => (
              <div key={order.id} className="acct-order-card acct-order-card-sm">
                <div className="acct-order-header">
                  <span className="acct-order-id">#{order.id}</span>
                  <StatusBadge estado={order.estado} />
                </div>
                <div className="acct-order-meta">
                  <span>{formatDate(order.creado_at)}</span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>
                {order.referencia_pago ? (
                  <div className="acct-order-meta">
                    <span>Ref: {order.referencia_pago}</span>
                    <span>Pago: {order.payment_status || 'approved'}</span>
                  </div>
                ) : null}
                <div className="acct-order-items-preview">
                  {order.items.slice(0, 3).map((item) => (
                    <img key={item.producto_id} src={item.imagen_url} alt={item.nombre} className="acct-order-thumb" loading="lazy" />
                  ))}
                  {order.items.length > 3 && (
                    <span className="acct-order-more">+{order.items.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="acct-section">
          <h3 className="acct-section-title">Pedidos recientes</h3>
          <EmptyState
            icon="box"
            title="Aún sin pedidos"
            subtitle="Cuando realices tu primera compra, aparecerá aquí."
            action={<Link to="/catalogo" className="acct-btn-primary">Ver catálogo</Link>}
          />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pedidos ─────────────────────────────────────────────────────────────

function TabPedidos({ orders, loading }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) return <SectionLoader />;

  if (!orders.length) {
    return (
      <div className="acct-tab-content">
        <EmptyState
          icon="box"
          title="Sin pedidos aún"
          subtitle="Explora nuestra colección y realiza tu primera compra."
          action={<Link to="/catalogo" className="acct-btn-primary">Ver catálogo</Link>}
        />
      </div>
    );
  }

  return (
    <div className="acct-tab-content">
      <div className="acct-order-list">
        {orders.map((order) => (
          <div key={order.id} className="acct-order-card">
            <button
              type="button"
              className="acct-order-header acct-order-toggle"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              aria-expanded={expanded === order.id}
            >
              <div className="acct-order-header-left">
                <span className="acct-order-id">Pedido #{order.id}</span>
                <span className="acct-order-date">{formatDate(order.creado_at)}</span>
              </div>
              <div className="acct-order-header-right">
                <StatusBadge estado={order.estado} />
                <strong className="acct-order-total">{formatPrice(order.total)}</strong>
                <span className="acct-order-chevron">{expanded === order.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === order.id && (
              <>
                <div className="acct-order-meta" style={{ padding: '0 1rem 1rem' }}>
                  <span>Ref: {order.referencia_pago || 'Sin referencia'}</span>
                  <span>Pago: {order.payment_status || 'approved'}</span>
                </div>
                <ul className="acct-order-items">
                  {order.items.length === 0 ? (
                    <li className="acct-order-item-empty">Sin detalles disponibles</li>
                  ) : (
                    order.items.map((item) => (
                      <li key={item.producto_id} className="acct-order-item">
                        <img src={item.imagen_url} alt={item.nombre} className="acct-order-item-img" loading="lazy" />
                        <div className="acct-order-item-info">
                          <span className="acct-order-item-name">{item.nombre}</span>
                          <span className="acct-order-item-tono">{item.tono}</span>
                        </div>
                        <div className="acct-order-item-price">
                          <span>x{item.cantidad}</span>
                          <strong>{formatPrice(item.precio * item.cantidad)}</strong>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Favoritos ───────────────────────────────────────────────────────────

function TabFavoritos({ catalogProducts, wishlistIds, onAddToCart, onToggleWishlist }) {
  const items = catalogProducts.filter((p) => wishlistIds.includes(p.id));

  if (!items.length) {
    return (
      <div className="acct-tab-content">
        <EmptyState
          icon="heart"
          title="Sin favoritos aún"
          subtitle="Guarda las piezas que más te gusten tocando el corazón."
          action={<Link to="/catalogo" className="acct-btn-primary">Explorar colección</Link>}
        />
      </div>
    );
  }

  return (
    <div className="acct-tab-content">
      <p className="acct-section-hint">{items.length} {items.length === 1 ? 'pieza guardada' : 'piezas guardadas'}</p>
      <div className="acct-fav-grid">
        {items.map((product) => (
          <div key={product.id} className="acct-fav-card">
            <Link to={`/producto/${product.id}`} className="acct-fav-img-wrap">
              <img src={product.imagen_url} alt={product.nombre} className="acct-fav-img" loading="lazy" />
            </Link>
            <div className="acct-fav-body">
              <Link to={`/producto/${product.id}`} className="acct-fav-name">{product.nombre}</Link>
              <span className="acct-fav-tono">{product.tono}</span>
              <div className="acct-fav-footer">
                <span className="acct-fav-price">{formatPrice(product.precio)}</span>
                <div className="acct-fav-actions">
                  <button
                    type="button"
                    className="acct-btn-icon acct-btn-danger"
                    title="Quitar de favoritos"
                    onClick={() => onToggleWishlist(product.id)}
                  >
                    <Icon type="trash" />
                  </button>
                  <button
                    type="button"
                    className="acct-btn-primary acct-btn-sm"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Agotado' : 'Al carrito'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Carrito ─────────────────────────────────────────────────────────────

function TabCarrito({ cartItems, onIncrement, onDecrement, onRemove }) {
  const total = cartItems.reduce((sum, item) => sum + normalizePrice(item.precio) * item.quantity, 0);
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);

  if (!cartItems.length) {
    return (
      <div className="acct-tab-content">
        <EmptyState
          icon="cart"
          title="Carrito vacío"
          subtitle="Agrega productos desde el catálogo para continuar."
          action={<Link to="/catalogo" className="acct-btn-primary">Ver catálogo</Link>}
        />
      </div>
    );
  }

  return (
    <div className="acct-tab-content">
      <ul className="acct-cart-list">
        {cartItems.map((item) => (
          <li key={item.id} className="acct-cart-item">
            <img src={item.imagen_url} alt={item.nombre} className="acct-cart-img" loading="lazy" />
            <div className="acct-cart-info">
              <span className="acct-cart-name">{item.nombre}</span>
              <span className="acct-cart-tono">{item.tono}</span>
              <div className="acct-cart-controls">
                <button type="button" className="acct-qty-btn" onClick={() => onDecrement(item.id)}>−</button>
                <span className="acct-qty-val">{item.quantity}</span>
                <button
                  type="button"
                  className="acct-qty-btn"
                  onClick={() => onIncrement(item.id)}
                  disabled={item.quantity >= item.stock}
                >+</button>
              </div>
            </div>
            <div className="acct-cart-right">
              <strong className="acct-cart-price">{formatPrice(item.precio * item.quantity)}</strong>
              <button type="button" className="acct-btn-icon acct-btn-danger" onClick={() => onRemove(item.id)}>
                <Icon type="trash" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="acct-cart-summary">
        <span>{count} {count === 1 ? 'producto' : 'productos'}</span>
        <div className="acct-cart-total">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <Link to="/checkout" className="acct-btn-primary acct-btn-full">
          Proceder al pago
        </Link>
      </div>
    </div>
  );
}

// ─── Tab: Direcciones ─────────────────────────────────────────────────────────

const EMPTY_ADDR = {
  alias: 'Casa',
  nombre_receptor: '',
  telefono: '',
  calle: '',
  ciudad: '',
  estado: '',
  codigo_postal: '',
  pais: 'México',
  es_principal: false,
};

function AddressForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial || EMPTY_ADDR);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form className="acct-addr-form" onSubmit={handleSubmit} noValidate>
      <div className="acct-form-row-2">
        <div className="acct-field">
          <label className="acct-label">Alias</label>
          <input className="acct-input" value={form.alias} onChange={(e) => set('alias', e.target.value)} placeholder="Casa, Trabajo…" />
        </div>
        <div className="acct-field">
          <label className="acct-label">Nombre del receptor *</label>
          <input className="acct-input" required value={form.nombre_receptor} onChange={(e) => set('nombre_receptor', e.target.value)} placeholder="Nombre completo" />
        </div>
      </div>
      <div className="acct-field">
        <label className="acct-label">Calle y número *</label>
        <input className="acct-input" required value={form.calle} onChange={(e) => set('calle', e.target.value)} placeholder="Av. Paseo de la Reforma 123" />
      </div>
      <div className="acct-form-row-3">
        <div className="acct-field">
          <label className="acct-label">Ciudad *</label>
          <input className="acct-input" required value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Ciudad de México" />
        </div>
        <div className="acct-field">
          <label className="acct-label">Estado *</label>
          <input className="acct-input" required value={form.estado} onChange={(e) => set('estado', e.target.value)} placeholder="CDMX" />
        </div>
        <div className="acct-field">
          <label className="acct-label">Código postal *</label>
          <input className="acct-input" required value={form.codigo_postal} onChange={(e) => set('codigo_postal', e.target.value)} placeholder="06600" />
        </div>
      </div>
      <div className="acct-form-row-2">
        <div className="acct-field">
          <label className="acct-label">País</label>
          <input className="acct-input" value={form.pais} onChange={(e) => set('pais', e.target.value)} placeholder="México" />
        </div>
        <div className="acct-field">
          <label className="acct-label">Teléfono</label>
          <input className="acct-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+52 55 0000 0000" />
        </div>
      </div>
      <label className="acct-checkbox-label">
        <input type="checkbox" checked={form.es_principal} onChange={(e) => set('es_principal', e.target.checked)} />
        Marcar como dirección principal
      </label>
      {error && <p className="acct-form-error">{error}</p>}
      <div className="acct-form-actions">
        <button type="button" className="acct-btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="acct-btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar dirección'}
        </button>
      </div>
    </form>
  );
}

function TabDirecciones() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAddr, setEditAddr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchMyAddresses()
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (formData) => {
    setSaving(true);
    setFormError('');
    try {
      if (editAddr) {
        const updated = await updateAddressApi(editAddr.id, formData);
        setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await createAddress(formData);
        setAddresses((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditAddr(null);
    } catch (err) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      await deleteAddressApi(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silent
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <SectionLoader />;

  return (
    <div className="acct-tab-content">
      {!showForm && (
        <button
          type="button"
          className="acct-btn-primary acct-btn-add"
          onClick={() => { setEditAddr(null); setFormError(''); setShowForm(true); }}
        >
          <Icon type="plus" /> Nueva dirección
        </button>
      )}

      {showForm && (
        <div className="acct-addr-form-wrap">
          <h3 className="acct-section-title">{editAddr ? 'Editar dirección' : 'Nueva dirección de envío'}</h3>
          <AddressForm
            initial={editAddr}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditAddr(null); }}
            saving={saving}
            error={formError}
          />
        </div>
      )}

      {!addresses.length && !showForm ? (
        <EmptyState
          icon="map"
          title="Sin direcciones guardadas"
          subtitle="Agrega tu primera dirección de envío para agilizar tus pedidos."
        />
      ) : (
        <div className="acct-addr-grid">
          {addresses.map((addr) => (
            <div key={addr.id} className={`acct-addr-card ${addr.es_principal ? 'is-principal' : ''}`}>
              {addr.es_principal && <span className="acct-addr-principal-badge">Principal</span>}
              <p className="acct-addr-alias">{addr.alias}</p>
              <p className="acct-addr-receptor">{addr.nombre_receptor}</p>
              <p className="acct-addr-line">{addr.calle}</p>
              <p className="acct-addr-line">{addr.ciudad}, {addr.estado} {addr.codigo_postal}</p>
              <p className="acct-addr-line">{addr.pais}</p>
              {addr.telefono && <p className="acct-addr-line">{addr.telefono}</p>}
              <div className="acct-addr-actions">
                <button
                  type="button"
                  className="acct-btn-icon"
                  title="Editar"
                  onClick={() => { setEditAddr(addr); setFormError(''); setShowForm(true); }}
                >
                  <Icon type="edit" />
                </button>
                <button
                  type="button"
                  className="acct-btn-icon acct-btn-danger"
                  title="Eliminar"
                  disabled={deleteId === addr.id}
                  onClick={() => handleDelete(addr.id)}
                >
                  <Icon type="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil({ user, onUserUpdated }) {
  const [infoForm, setInfoForm] = useState({ nombre: user?.name || '', email: user?.email || '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setInfoMsg(null);
    setInfoSaving(true);
    try {
      const res = await updateMyProfile({ nombre: infoForm.nombre, email: infoForm.email });
      setInfoMsg({ type: 'ok', text: 'Perfil actualizado correctamente.' });
      onUserUpdated({ name: res.nombre, email: res.email });
    } catch (err) {
      setInfoMsg({ type: 'err', text: err.message || 'No se pudo actualizar el perfil.' });
    } finally {
      setInfoSaving(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message || 'No se pudo cambiar la contraseña.' });
    } finally {
      setPwSaving(false);
    }
  };

  const toggleShow = (field) => setShowPw((p) => ({ ...p, [field]: !p[field] }));

  return (
    <div className="acct-tab-content acct-perfil-grid">
      {/* Información personal */}
      <section className="acct-perfil-section">
        <h3 className="acct-section-title"><Icon type="user" /> Información personal</h3>
        <form className="acct-form" onSubmit={handleInfoSubmit} noValidate>
          <div className="acct-field">
            <label className="acct-label">Nombre completo</label>
            <input
              className="acct-input"
              required
              value={infoForm.nombre}
              onChange={(e) => setInfoForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </div>
          <div className="acct-field">
            <label className="acct-label">Correo electrónico</label>
            <input
              className="acct-input"
              type="email"
              required
              value={infoForm.email}
              onChange={(e) => setInfoForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          {infoMsg && (
            <p className={`acct-form-msg ${infoMsg.type === 'ok' ? 'acct-form-ok' : 'acct-form-error'}`}>
              {infoMsg.type === 'ok' && <Icon type="check" />} {infoMsg.text}
            </p>
          )}
          <button type="submit" className="acct-btn-primary" disabled={infoSaving}>
            {infoSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="acct-perfil-section">
        <h3 className="acct-section-title"><Icon type="lock" /> Cambiar contraseña</h3>
        <form className="acct-form" onSubmit={handlePwSubmit} noValidate>
          {[
            { key: 'current',  field: 'currentPassword', label: 'Contraseña actual' },
            { key: 'next',     field: 'newPassword',     label: 'Nueva contraseña' },
            { key: 'confirm',  field: 'confirm',          label: 'Confirmar nueva contraseña' },
          ].map(({ key, field, label }) => (
            <div className="acct-field" key={field}>
              <label className="acct-label">{label}</label>
              <div className="acct-input-wrap">
                <input
                  className="acct-input"
                  type={showPw[key] ? 'text' : 'password'}
                  required
                  value={pwForm[field]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                />
                <button type="button" className="acct-eye-btn" onClick={() => toggleShow(key)} tabIndex={-1}>
                  <Icon type={showPw[key] ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </div>
          ))}
          {pwMsg && (
            <p className={`acct-form-msg ${pwMsg.type === 'ok' ? 'acct-form-ok' : 'acct-form-error'}`}>
              {pwMsg.type === 'ok' && <Icon type="check" />} {pwMsg.text}
            </p>
          )}
          <button type="submit" className="acct-btn-primary" disabled={pwSaving}>
            {pwSaving ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserAccountPage({
  user,
  catalogProducts,
  wishlistIds,
  cartItems,
  onAddToCart,
  onToggleWishlist,
  onIncrementCartItem,
  onDecrementCartItem,
  onRemoveCartItem,
  onUserUpdated,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resumen');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch orders once
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label || '';

  return (
    <main className="acct-page">
      <div className="acct-layout">
        {/* Sidebar */}
        <aside className="acct-sidebar">
          <div className="acct-sidebar-header">
            <div className="acct-sidebar-avatar" aria-hidden="true">
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="acct-sidebar-user">
              <span className="acct-sidebar-name">{user?.name}</span>
              <span className="acct-sidebar-email">{user?.email}</span>
            </div>
          </div>
          <nav className="acct-sidebar-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`acct-nav-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon type={tab.icon} />
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="acct-nav-btn acct-nav-btn-back"
            onClick={() => navigate('/')}
          >
            ← Volver a la tienda
          </button>
        </aside>

        {/* Mobile top bar */}
        <div className="acct-mobile-bar">
          <button
            type="button"
            className="acct-mobile-tab-btn"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <Icon type={TABS.find((t) => t.id === activeTab)?.icon} />
            <span>{activeLabel}</span>
            <span className="acct-mobile-chevron">{mobileMenuOpen ? '▲' : '▼'}</span>
          </button>
          {mobileMenuOpen && (
            <div className="acct-mobile-menu">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`acct-mobile-menu-item ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon type={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="acct-content">
          <h1 className="acct-page-title">{activeLabel}</h1>

          {activeTab === 'resumen' && (
            <TabResumen
              user={user}
              orders={orders}
              wishlistIds={wishlistIds}
              cartItems={cartItems}
              ordersLoading={ordersLoading}
            />
          )}
          {activeTab === 'pedidos' && (
            <TabPedidos orders={orders} loading={ordersLoading} />
          )}
          {activeTab === 'favoritos' && (
            <TabFavoritos
              catalogProducts={catalogProducts}
              wishlistIds={wishlistIds}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
            />
          )}
          {activeTab === 'carrito' && (
            <TabCarrito
              cartItems={cartItems}
              onIncrement={onIncrementCartItem}
              onDecrement={onDecrementCartItem}
              onRemove={onRemoveCartItem}
            />
          )}
          {activeTab === 'direcciones' && <TabDirecciones />}
          {activeTab === 'perfil' && (
            <TabPerfil user={user} onUserUpdated={onUserUpdated} />
          )}
        </div>
      </div>
    </main>
  );
}
