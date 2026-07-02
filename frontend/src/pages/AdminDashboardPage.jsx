import { useEffect, useState } from 'react';
import { createAdminAnnouncement, createAdminProducto, fetchAdminDashboard, fetchOrderDetail, updateAdminAnnouncement, updateAdminProducto, updateOrderStatus, updateUsuarioRol } from '../api.js';
import { formatPrice as formatCurrency, normalizePrice } from '../utils/pricing.js';
import './AdminDashboardPage.css';

const initialProductForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  imagen_url: '',
  stock: '0',
  categoria: '',
  tono: '',
  material: '',
  etiqueta: '',
};

function formatInteger(value) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildRoleDrafts(users) {
  return Object.fromEntries(users.map((account) => [account.id, account.rol]));
}

function buildAnnouncementDrafts(announcements) {
  return Object.fromEntries((announcements || []).map((item) => [item.id, {
    imagen_url: item.imagen_url || '',
    estado: item.estado || 'activo',
  }]));
}

const ADMIN_TABS = [
  { id: 'analitica', label: 'Analítica' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'productos', label: 'Productos' },
  { id: 'envios', label: 'Envíos' },
  { id: 'anuncios', label: 'Anuncios' },
];

const SHIPMENT_STATES = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'entregado', label: 'Entregado' },
];

function formatAddress(address) {
  if (!address) {
    return null;
  }

  const parts = [
    address.calle,
    address.ciudad,
    address.estado,
    address.codigo_postal,
    address.pais,
  ].filter((part) => part && String(part).trim());

  return parts.length > 0 ? parts.join(', ') : null;
}

function normalizeOrderStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'confirmado' || normalized === 'pagado' || normalized === 'pago confirmado') {
    return 'pago_confirmado';
  }

  return normalized;
}

function getOrderStatusLabel(status) {
  const normalized = normalizeOrderStatus(status);

  const labels = {
    pendiente: 'Pendiente',
    pago_confirmado: 'Pago confirmado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };

  return labels[normalized] || String(status || 'Sin estado');
}

function AdminDashboardPage({ user, onProductCreated }) {
  const [dashboard, setDashboard] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [productForm, setProductForm] = useState(initialProductForm);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(initialProductForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ imagen_url: '', estado: 'activo' });
  const [announcementDrafts, setAnnouncementDrafts] = useState({});
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [savingAnnouncementId, setSavingAnnouncementId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [activeTab, setActiveTab] = useState('analitica');
  const [updatingShipmentId, setUpdatingShipmentId] = useState(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState('all');
  const [shipmentPage, setShipmentPage] = useState(0);
  const [hoveredTimelineDay, setHoveredTimelineDay] = useState(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(0);

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productPage, setProductPage] = useState(0);

  const PAGE_SIZE = 10;

  const loadDashboard = async ({ showLoader = false } = {}) => {
    if (showLoader || !dashboard) {
      setLoading(true);
    }

    setDashboardError('');

    try {
      const data = await fetchAdminDashboard();
      setDashboard(data);
      setRoleDrafts(buildRoleDrafts(data.users || []));
      setAnnouncementDrafts(buildAnnouncementDrafts(data.announcements || []));
    } catch (error) {
      setDashboardError(error.message || 'No se pudo cargar el dashboard administrativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard({ showLoader: true });
  }, []);

  useEffect(() => {
    if (!successMessage && !actionError) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage('');
      setActionError('');
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [successMessage, actionError]);

  const handleProductFieldChange = (event) => {
    const { name, value } = event.target;
    setProductForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setIsCreatingProduct(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const payload = {
        ...productForm,
        precio: Number(productForm.precio),
        stock: Number(productForm.stock || 0),
      };

      const createdProduct = await createAdminProducto(payload);
      setSuccessMessage(`${createdProduct.nombre} se agregó al catálogo.`);
      setProductForm(initialProductForm);
      onProductCreated?.(createdProduct);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo crear el producto.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      nombre: product.nombre || '',
      descripcion: product.descripcion || '',
      precio: String(normalizePrice(product.precio) || ''),
      imagen_url: product.imagen_url || '',
      stock: String(product.stock || '0'),
      categoria: product.categoria || '',
      tono: product.tono || '',
      material: product.material || '',
      etiqueta: product.etiqueta || '',
    });
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setIsSavingEdit(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const payload = {
        ...editForm,
        precio: Number(editForm.precio),
        stock: Number(editForm.stock || 0),
      };

      const updated = await updateAdminProducto(editingProduct.id, payload);
      setSuccessMessage(`${updated.nombre} se actualizó correctamente.`);
      setEditingProduct(null);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar el producto.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOrderClick = async (orderId) => {
    setSelectedOrder(orderId);
    setOrderDetail(null);
    setLoadingOrder(true);

    try {
      const detail = await fetchOrderDetail(orderId);
      setOrderDetail(detail);
    } catch (error) {
      setActionError(error.message || 'No se pudo cargar el detalle de la orden.');
      setSelectedOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleRoleChange = async (account) => {
    const nextRole = roleDrafts[account.id] || account.rol;

    if (nextRole === account.rol) {
      return;
    }

    setUpdatingUserId(account.id);
    setActionError('');
    setSuccessMessage('');

    try {
      const updatedUser = await updateUsuarioRol(account.id, nextRole);
      setSuccessMessage(`${updatedUser.nombre} ahora tiene rol ${updatedUser.rol}.`);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar el rol.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleShipmentStatusChange = async (orderId, nextState) => {
    setUpdatingShipmentId(orderId);
    setActionError('');
    setSuccessMessage('');

    try {
      await updateOrderStatus(orderId, nextState);
      setSuccessMessage(`La orden #${orderId} ahora está en estado "${nextState}".`);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar el estado de la orden.');
    } finally {
      setUpdatingShipmentId(null);
    }
  };

  const handleCreateAnnouncement = async (event) => {
    event.preventDefault();
    setIsCreatingAnnouncement(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const payload = {
        imagen_url: String(announcementForm.imagen_url || '').trim(),
        estado: announcementForm.estado === 'inactivo' ? 'inactivo' : 'activo',
      };

      await createAdminAnnouncement(payload);
      setSuccessMessage('Anuncio creado correctamente.');
      setAnnouncementForm({ imagen_url: '', estado: 'activo' });
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo crear el anuncio.');
    } finally {
      setIsCreatingAnnouncement(false);
    }
  };

  const handleSaveAnnouncement = async (announcementId) => {
    const draft = announcementDrafts[announcementId];

    if (!draft) {
      return;
    }

    setSavingAnnouncementId(announcementId);
    setActionError('');
    setSuccessMessage('');

    try {
      await updateAdminAnnouncement(announcementId, {
        imagen_url: String(draft.imagen_url || '').trim(),
        estado: draft.estado === 'inactivo' ? 'inactivo' : 'activo',
      });

      setSuccessMessage(`Anuncio #${announcementId} actualizado.`);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar el anuncio.');
    } finally {
      setSavingAnnouncementId(null);
    }
  };

  const metrics = dashboard?.metrics || {
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    totalProducts: 0,
    totalStock: 0,
    lowStockProducts: 0,
    totalUsers: 0,
    totalAdmins: 0,
  };

  const featuredProduct = dashboard?.featuredProduct;
  const recentOrders = dashboard?.recentOrders || [];
  const categoryBreakdown = dashboard?.categoryBreakdown || [];
  const users = dashboard?.users || [];
  const products = dashboard?.products || [];
  const alerts = dashboard?.alerts || [];
  const announcements = dashboard?.announcements || [];
  const lowStockRatio = metrics.totalProducts > 0 ? Math.round((metrics.lowStockProducts / metrics.totalProducts) * 100) : 0;
  const adminCoverage = metrics.totalUsers > 0 ? Math.round((metrics.totalAdmins / metrics.totalUsers) * 100) : 0;
  const maxCategoryStock = Math.max(...categoryBreakdown.map((category) => Number(category.stockTotal || 0)), 1);

  const filteredOrders = recentOrders.filter((order) => {
    const matchesSearch = !orderSearch ||
      order.cliente?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.cliente_email?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      String(order.id).includes(orderSearch);
    const matchesStatus = orderStatusFilter === 'all' || normalizeOrderStatus(order.estado) === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice(orderPage * PAGE_SIZE, (orderPage + 1) * PAGE_SIZE);

  const productCategories = [...new Set(products.map((p) => p.categoria).filter(Boolean))];
  const filteredProducts = products.filter((product) => {
    const matchesSearch = !productSearch ||
      product.nombre?.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.etiqueta?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || product.categoria === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });
  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice(productPage * PAGE_SIZE, (productPage + 1) * PAGE_SIZE);

  const salesStatuses = new Set(['pago_confirmado', 'enviado', 'entregado']);

  // La ventana termina en el día más reciente con actividad (o hoy) para que las
  // ventas registradas hoy o con hora nocturna siempre queden dentro del rango.
  const now = new Date();
  const latestOrderDate = recentOrders.reduce((latest, order) => {
    const orderDate = new Date(order.creado_at);
    if (Number.isNaN(orderDate.getTime())) return latest;
    return orderDate > latest ? orderDate : latest;
  }, now);

  const salesWindowEnd = new Date(latestOrderDate);
  salesWindowEnd.setHours(23, 59, 59, 999);

  const salesWindowStart = new Date(salesWindowEnd);
  salesWindowStart.setHours(0, 0, 0, 0);
  salesWindowStart.setDate(salesWindowStart.getDate() - 29);

  const lastMonthSales = recentOrders.filter((order) => {
    const normalizedStatus = normalizeOrderStatus(order.estado);
    const orderDate = new Date(order.creado_at);
    return salesStatuses.has(normalizedStatus)
      && !Number.isNaN(orderDate.getTime())
      && orderDate >= salesWindowStart
      && orderDate <= salesWindowEnd;
  });

  const pieStatusOrder = ['pago_confirmado', 'enviado', 'entregado'];
  const pieStatusColors = {
    pago_confirmado: '#0ea5a0',
    enviado: '#2563eb',
    entregado: '#7c3aed',
  };

  const pieStatusMap = lastMonthSales.reduce((acc, order) => {
    const status = normalizeOrderStatus(order.estado);
    const amount = Number(order.total || 0);
    const current = acc.get(status) || { status, amount: 0, count: 0 };
    current.amount += amount;
    current.count += 1;
    acc.set(status, current);
    return acc;
  }, new Map());

  const pieRows = pieStatusOrder
    .map((status) => {
      const row = pieStatusMap.get(status) || { status, amount: 0, count: 0 };
      return {
        ...row,
        label: getOrderStatusLabel(status),
        color: pieStatusColors[status],
      };
    })
    .filter((row) => row.amount > 0);

  const pieTotalAmount = pieRows.reduce((sum, row) => sum + row.amount, 0);
  let pieOffset = 0;
  const pieSegments = pieRows.map((row) => {
    const percentage = pieTotalAmount > 0 ? (row.amount / pieTotalAmount) * 100 : 0;
    const segment = {
      ...row,
      percentage,
      dashOffset: -pieOffset,
    };
    pieOffset += percentage;
    return segment;
  });

  const timelineDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(salesWindowStart);
    date.setDate(salesWindowStart.getDate() + index);
    const key = toLocalDateKey(date);
    return { date, key, total: 0, orders: 0, products: 0 };
  });

  const timelineMap = new Map(timelineDays.map((day) => [day.key, day]));

  lastMonthSales.forEach((order) => {
    const key = toLocalDateKey(order.creado_at);
    const bucket = key ? timelineMap.get(key) : null;

    if (bucket) {
      bucket.total += Number(order.total || 0);
      bucket.orders += 1;
      bucket.products += Number(order.total_productos || 0);
    }
  });

  const timelineSeries = timelineDays.map((day) => timelineMap.get(day.key) || day);
  const timelineMaxTotal = Math.max(...timelineSeries.map((day) => day.total), 1);
  const timelineChartHeight = 72;
  const timelinePointsData = timelineSeries.map((day, index) => {
    const x = timelineSeries.length > 1 ? (index / (timelineSeries.length - 1)) * 100 : 0;
    const y = timelineChartHeight - (day.total / timelineMaxTotal) * timelineChartHeight;

    return {
      ...day,
      x,
      y,
    };
  });

  const timelineLinePoints = timelinePointsData
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const timelineAreaPoints = `0,${timelineChartHeight} ${timelineLinePoints} 100,${timelineChartHeight}`;

  const hoveredDayData = hoveredTimelineDay
    ? timelinePointsData.find((day) => day.key === hoveredTimelineDay) || null
    : null;

  const timelineLabels = [
    timelineSeries[0],
    timelineSeries[Math.floor((timelineSeries.length - 1) / 2)],
    timelineSeries[timelineSeries.length - 1],
  ];

  const shipments = recentOrders.filter((order) => order.cliente_tipo !== 'anonimo' || order.direccion_envio);
  const filteredShipments = recentOrders.filter((order) => {
    const address = order.direccion_envio;
    const matchesSearch = !shipmentSearch ||
      order.cliente?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      order.cliente_email?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      String(order.id).includes(shipmentSearch) ||
      (address && formatAddress(address)?.toLowerCase().includes(shipmentSearch.toLowerCase()));
    const matchesStatus = shipmentStatusFilter === 'all' || normalizeOrderStatus(order.estado) === shipmentStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const shipmentTotalPages = Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE));
  const paginatedShipments = filteredShipments.slice(shipmentPage * PAGE_SIZE, (shipmentPage + 1) * PAGE_SIZE);
  const pendingShipments = shipments.filter((order) => {
    const normalizedStatus = normalizeOrderStatus(order.estado);
    return normalizedStatus === 'pendiente' || normalizedStatus === 'pago_confirmado';
  }).length;
  const inTransitShipments = shipments.filter((order) => order.estado === 'enviado').length;
  const deliveredShipments = shipments.filter((order) => order.estado === 'entregado').length;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-hero">
          <div>
            <p className="admin-eyebrow">Panel administrativo</p>
            <h1>Visión operativa de Azami para {user.name}.</h1>
            <p className="admin-hero-copy">
              Controla ventas, inventario, producto destacado y gestión interna desde una sola vista.
              El acceso está protegido por rol y cada acción sensible valida la sesión del administrador.
            </p>
          </div>

          <div className="admin-hero-meta">
            <span className="admin-meta-pill">Rol activo: {user.role}</span>
            <span className="admin-meta-pill">Actualizado: {formatDate(dashboard?.generatedAt)}</span>
          </div>
        </header>

        <nav className="admin-tabbar" aria-label="Secciones del panel">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {(successMessage || actionError) && (
          <div className={`admin-feedback ${actionError ? 'is-error' : 'is-success'}`}>
            {actionError || successMessage}
          </div>
        )}

        {dashboardError && <div className="admin-feedback is-error">{dashboardError}</div>}

        {loading ? (
          <div className="admin-loading-card">
            <p>Cargando reporte administrativo...</p>
          </div>
        ) : (
          <>
            {activeTab === 'analitica' && (
            <>
            <section className="admin-kpi-grid">
              <article className="admin-kpi-card">
                <span className="admin-kpi-label">Ventas totales</span>
                <strong>{formatCurrency(metrics.totalRevenue)}</strong>
                <p>{formatInteger(metrics.totalOrders)} ordenes registradas</p>
              </article>

              <article className="admin-kpi-card">
                <span className="admin-kpi-label">Ticket promedio</span>
                <strong>{formatCurrency(metrics.averageTicket)}</strong>
                <p>Promedio por orden emitida</p>
              </article>

              <article className="admin-kpi-card">
                <span className="admin-kpi-label">Inventario total</span>
                <strong>{formatInteger(metrics.totalStock)}</strong>
                <p>{formatInteger(metrics.totalProducts)} productos activos</p>
              </article>

              <article className="admin-kpi-card admin-kpi-card-accent">
                <span className="admin-kpi-label">Usuarios</span>
                <strong>{formatInteger(metrics.totalUsers)}</strong>
                <p>{formatInteger(metrics.totalAdmins)} administradores activos</p>
              </article>
            </section>

            <section className="admin-report-grid">
              <article className="admin-panel admin-featured-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Producto destacado</p>
                    <h2>La pieza con mayor tracción actual</h2>
                  </div>
                </div>

                {featuredProduct ? (
                  <div className="admin-featured-card">
                    <div className="admin-featured-media">
                      {featuredProduct.imagen_url ? (
                        <img src={featuredProduct.imagen_url} alt={featuredProduct.nombre} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="admin-featured-placeholder">Sin imagen</div>
                      )}
                    </div>

                    <div className="admin-featured-copy">
                      <div>
                        <span className="admin-tag">{featuredProduct.categoria}</span>
                        <h3>{featuredProduct.nombre}</h3>
                        <p>{featuredProduct.tono} · {featuredProduct.material}</p>
                      </div>
                      <dl className="admin-featured-stats">
                        <div>
                          <dt>Precio</dt>
                          <dd>{formatCurrency(featuredProduct.precio)}</dd>
                        </div>
                        <div>
                          <dt>Stock</dt>
                          <dd>{formatInteger(featuredProduct.stock)} unidades</dd>
                        </div>
                        <div>
                          <dt>Etiqueta</dt>
                          <dd>{featuredProduct.etiqueta || 'Online'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <h3>No hay productos todavía</h3>
                    <p>Crea el primer producto desde la gestión rápida para ver el panel con datos reales.</p>
                  </div>
                )}
              </article>

              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Salud operativa</p>
                    <h2>Inventario y cobertura administrativa</h2>
                  </div>
                </div>

                <div className="admin-health-grid">
                  <div className="admin-health-card">
                    <div className="admin-health-head">
                      <span>Productos con stock bajo</span>
                      <strong>{lowStockRatio}%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <span className="admin-progress-fill" style={{ width: `${Math.max(lowStockRatio, metrics.lowStockProducts > 0 ? 12 : 0)}%` }} />
                    </div>
                    <p>{formatInteger(metrics.lowStockProducts)} referencias requieren seguimiento cercano.</p>
                  </div>

                  <div className="admin-health-card">
                    <div className="admin-health-head">
                      <span>Participación admin</span>
                      <strong>{adminCoverage}%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <span className="admin-progress-fill is-soft" style={{ width: `${Math.max(adminCoverage, metrics.totalAdmins > 0 ? 12 : 0)}%` }} />
                    </div>
                    <p>{formatInteger(metrics.totalAdmins)} administradores gestionan la operación.</p>
                  </div>
                </div>
              </article>
            </section>

            <section className="admin-report-grid admin-analytics-charts-grid">
              <article className="admin-panel admin-chart-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Últimas ventas</p>
                    <h2>Distribución por estado (pastel)</h2>
                  </div>
                </div>

                {pieTotalAmount > 0 ? (
                  <div className="admin-pie-layout">
                    <div className="admin-pie-wrap" aria-hidden="true">
                      <svg viewBox="0 0 160 160" className="admin-pie-chart" role="img">
                        <circle className="admin-pie-track" cx="80" cy="80" r="56" pathLength="100" />
                        {pieSegments.map((segment) => (
                          <circle
                            key={segment.status}
                            className="admin-pie-slice"
                            cx="80"
                            cy="80"
                            r="56"
                            pathLength="100"
                            style={{
                              stroke: segment.color,
                              strokeDasharray: `${segment.percentage} ${100 - segment.percentage}`,
                              strokeDashoffset: segment.dashOffset,
                            }}
                          />
                        ))}
                      </svg>
                      <div className="admin-pie-center">
                        <strong>{formatCurrency(pieTotalAmount)}</strong>
                        <small>Últimos 30 días</small>
                      </div>
                    </div>

                    <div className="admin-pie-legend">
                      {pieSegments.map((segment) => (
                        <div key={segment.status} className="admin-pie-legend-item">
                          <span className="admin-pie-color" style={{ backgroundColor: segment.color }} />
                          <div>
                            <strong>{segment.label}</strong>
                            <p>{formatCurrency(segment.amount)} · {formatInteger(segment.count)} ordenes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Sin ventas recientes</h3>
                    <p>No hay órdenes de venta en los últimos 30 días para dibujar la gráfica de pastel.</p>
                  </div>
                )}
              </article>

              <article className="admin-panel admin-chart-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Último mes</p>
                    <h2>Línea de ventas diarias</h2>
                  </div>
                </div>

                {lastMonthSales.length > 0 ? (
                  <div className="admin-line-layout">
                    <div className="admin-line-meta">
                      <div>
                        <span>Total vendido</span>
                        <strong>{formatCurrency(lastMonthSales.reduce((sum, order) => sum + Number(order.total || 0), 0))}</strong>
                      </div>
                      <div>
                        <span>Órdenes del mes</span>
                        <strong>{formatInteger(lastMonthSales.length)}</strong>
                      </div>
                    </div>

                    <div className="admin-line-chart-wrap">
                      <svg viewBox={`0 0 100 ${timelineChartHeight}`} className="admin-line-chart">
                        <line x1="0" y1={timelineChartHeight} x2="100" y2={timelineChartHeight} className="admin-line-axis" />
                        <line x1="0" y1={timelineChartHeight / 2} x2="100" y2={timelineChartHeight / 2} className="admin-line-axis is-mid" />
                        <line x1="0" y1="0" x2="100" y2="0" className="admin-line-axis" />
                        <polygon points={timelineAreaPoints} className="admin-line-area" />
                        <polyline points={timelineLinePoints} className="admin-line-stroke" />
                        {timelinePointsData.map((day) => (
                          <circle
                            key={day.key}
                            cx={day.x}
                            cy={day.y}
                            r={hoveredTimelineDay === day.key ? 1.55 : 1.1}
                            className={`admin-line-point ${hoveredTimelineDay === day.key ? 'is-active' : ''}`}
                            onMouseEnter={() => setHoveredTimelineDay(day.key)}
                            onMouseLeave={() => setHoveredTimelineDay(null)}
                            onFocus={() => setHoveredTimelineDay(day.key)}
                            onBlur={() => setHoveredTimelineDay(null)}
                          />
                        ))}
                      </svg>

                      {hoveredDayData ? (
                        <div
                          className={`admin-line-tooltip ${hoveredDayData.x > 72 ? 'is-left' : 'is-right'}`}
                          style={{
                            left: `${hoveredDayData.x}%`,
                            top: `${(hoveredDayData.y / timelineChartHeight) * 100}%`,
                          }}
                        >
                          <strong>{formatShortDate(hoveredDayData.date)}</strong>
                          <span>Productos: {formatInteger(hoveredDayData.products)}</span>
                          <span>Ventas: {formatCurrency(hoveredDayData.total)}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="admin-line-y-scale">
                      <span>{formatCurrency(timelineMaxTotal)}</span>
                      <span>{formatCurrency(timelineMaxTotal / 2)}</span>
                      <span>{formatCurrency(0)}</span>
                    </div>

                    <div className="admin-line-labels">
                      {timelineLabels.map((day) => (
                        <span key={day.key}>{formatShortDate(day.date)}</span>
                      ))}
                    </div>

                    <div className="admin-line-hint">Pasa el cursor por cada puntico para ver el detalle diario.</div>
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Sin movimientos este mes</h3>
                    <p>La línea de tiempo aparecerá cuando existan ventas registradas durante el último mes.</p>
                  </div>
                )}
              </article>
            </section>
            </>
            )}

            {activeTab === 'ventas' && (
            <section className="admin-panel admin-orders-panel">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-panel-kicker">Todas las órdenes</p>
                  <h2>Historial completo de ventas</h2>
                </div>
              </div>

              <div className="admin-table-controls">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Buscar por cliente, email o # orden..."
                  value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(0); }}
                />
                <select
                  className="admin-filter-select"
                  value={orderStatusFilter}
                  onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(0); }}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pago_confirmado">Pago confirmado</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>

              {paginatedOrders.length > 0 ? (
                <>
                  <div className="admin-products-table-wrap">
                    <table className="admin-products-table admin-orders-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Cliente</th>
                          <th>Email</th>
                          <th>Total</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order) => {
                          const normalizedStatus = normalizeOrderStatus(order.estado);

                          return (
                          <tr key={order.id} className="admin-order-row" onClick={() => handleOrderClick(order.id)}>
                            <td data-label="#"><strong>{order.id}</strong></td>
                            <td data-label="Cliente">{order.cliente}</td>
                            <td data-label="Email"><small>{order.cliente_email || '—'}</small></td>
                            <td data-label="Total">{formatCurrency(order.total)}</td>
                            <td data-label="Estado"><span className={`admin-status-badge is-${normalizedStatus}`}>{getOrderStatusLabel(order.estado)}</span></td>
                            <td data-label="Fecha"><small>{formatDate(order.creado_at)}</small></td>
                            <td data-label="Acciones">
                              <button
                                type="button"
                                className="admin-secondary-button admin-edit-btn"
                                onClick={(e) => { e.stopPropagation(); handleOrderClick(order.id); }}
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-pagination">
                    <button type="button" disabled={orderPage === 0} onClick={() => setOrderPage((p) => p - 1)}>← Anterior</button>
                    <span>Página {orderPage + 1} de {orderTotalPages} ({filteredOrders.length} resultados)</span>
                    <button type="button" disabled={orderPage + 1 >= orderTotalPages} onClick={() => setOrderPage((p) => p + 1)}>Siguiente →</button>
                  </div>
                </>
              ) : (
                <div className="admin-empty-state compact">
                  <h3>Sin resultados</h3>
                  <p>{recentOrders.length > 0 ? 'No hay órdenes que coincidan con los filtros.' : 'Cuando se generen ventas, aquí verás el historial completo.'}</p>
                </div>
              )}
            </section>
            )}

            {activeTab === 'analitica' && (
            <section className="admin-report-grid admin-report-grid-secondary">
              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Stock por categoría</p>
                    <h2>Distribución del inventario</h2>
                  </div>
                </div>

                <div className="admin-category-list">
                  {categoryBreakdown.length > 0 ? categoryBreakdown.map((category) => {
                    const stockValue = Number(category.stockTotal || 0);
                    const width = Math.max(Math.round((stockValue / maxCategoryStock) * 100), 10);

                    return (
                      <div key={category.categoria} className="admin-category-item">
                        <div className="admin-category-head">
                          <strong>{category.categoria}</strong>
                          <span>{formatInteger(stockValue)} en stock</span>
                        </div>
                        <div className="admin-progress-track compact">
                          <span className="admin-progress-fill" style={{ width: `${width}%` }} />
                        </div>
                        <small>{formatInteger(category.totalProductos)} producto(s)</small>
                      </div>
                    );
                  }) : (
                    <div className="admin-empty-state compact">
                      <h3>Sin categorías disponibles</h3>
                      <p>El inventario aparecerá aquí apenas existan productos cargados.</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Alertas</p>
                    <h2>Estado del sistema</h2>
                  </div>
                </div>

                <div className="admin-alert-list">
                  {alerts.length > 0 ? alerts.map((alert) => (
                    <div key={alert.id} className="admin-alert-card">
                      <strong>{alert.title}</strong>
                      <p>{alert.detail}</p>
                    </div>
                  )) : (
                    <div className="admin-alert-card is-neutral">
                      <strong>Sin alertas críticas</strong>
                      <p>El panel no detecta incidentes relevantes en este momento.</p>
                    </div>
                  )}
                </div>
              </article>
            </section>
            )}

            {activeTab === 'productos' && (
            <section className="admin-management-grid">
              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Gestión de productos</p>
                    <h2>Alta rápida de catálogo</h2>
                  </div>
                </div>

                <form className="admin-product-form" onSubmit={handleCreateProduct}>
                  <div className="admin-form-grid">
                    <label className="admin-field admin-field-wide">
                      <span>Nombre</span>
                      <input type="text" name="nombre" value={productForm.nombre} onChange={handleProductFieldChange} placeholder="Bolso Azami Atelier" required />
                    </label>

                    <label className="admin-field admin-field-wide">
                      <span>Descripción</span>
                      <textarea name="descripcion" value={productForm.descripcion} onChange={handleProductFieldChange} placeholder="Detalle editorial del producto" rows="4" />
                    </label>

                    <label className="admin-field">
                      <span>Precio (COP)</span>
                      <input type="number" min="1000" step="1000" name="precio" value={productForm.precio} onChange={handleProductFieldChange} placeholder="1080000" required />
                    </label>

                    <label className="admin-field">
                      <span>Stock</span>
                      <input type="number" min="0" step="1" name="stock" value={productForm.stock} onChange={handleProductFieldChange} placeholder="12" />
                    </label>

                    <label className="admin-field">
                      <span>Categoría</span>
                      <input type="text" name="categoria" value={productForm.categoria} onChange={handleProductFieldChange} placeholder="Colección Atelier" />
                    </label>

                    <label className="admin-field">
                      <span>Tono</span>
                      <input type="text" name="tono" value={productForm.tono} onChange={handleProductFieldChange} placeholder="Marfil" />
                    </label>

                    <label className="admin-field">
                      <span>Material</span>
                      <input type="text" name="material" value={productForm.material} onChange={handleProductFieldChange} placeholder="Cuero premium" />
                    </label>

                    <label className="admin-field">
                      <span>Etiqueta</span>
                      <input type="text" name="etiqueta" value={productForm.etiqueta} onChange={handleProductFieldChange} placeholder="Lanzamiento" />
                    </label>

                    <label className="admin-field admin-field-wide">
                      <span>Imagen URL</span>
                      <input type="url" name="imagen_url" value={productForm.imagen_url} onChange={handleProductFieldChange} placeholder="https://..." />
                    </label>
                  </div>

                  <button type="submit" className="admin-primary-button" disabled={isCreatingProduct}>
                    {isCreatingProduct ? 'Guardando producto...' : 'Crear producto'}
                  </button>
                </form>
              </article>
            </section>
            )}

            {activeTab === 'ventas' && (
            <section className="admin-management-grid">
              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Gestión de usuarios</p>
                    <h2>Roles y accesos</h2>
                  </div>
                </div>

                <div className="admin-users-list">
                  {users.map((account) => (
                    <div key={account.id} className="admin-user-item">
                      <div>
                        <strong>{account.nombre}</strong>
                        <p>{account.email}</p>
                        <small>Creado: {formatDate(account.creado_at)}</small>
                      </div>

                      <div className="admin-user-controls">
                        <select
                          value={roleDrafts[account.id] || account.rol}
                          onChange={(event) => setRoleDrafts((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))}
                          disabled={account.id === user.id}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => handleRoleChange(account)}
                          disabled={account.id === user.id || updatingUserId === account.id || (roleDrafts[account.id] || account.rol) === account.rol}
                        >
                          {account.id === user.id ? 'Sesión actual' : updatingUserId === account.id ? 'Guardando...' : 'Actualizar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
            )}

            {activeTab === 'productos' && (
            <section className="admin-panel admin-products-panel">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-panel-kicker">Catálogo activo</p>
                  <h2>Referencia rápida de inventario</h2>
                </div>
              </div>

              <div className="admin-table-controls">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Buscar por nombre o etiqueta..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductPage(0); }}
                />
                <select
                  className="admin-filter-select"
                  value={productCategoryFilter}
                  onChange={(e) => { setProductCategoryFilter(e.target.value); setProductPage(0); }}
                >
                  <option value="all">Todas las categorías</option>
                  {productCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {paginatedProducts.length > 0 ? (
                <>
                  <div className="admin-products-table-wrap">
                    <table className="admin-products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Tono</th>
                          <th>Stock</th>
                          <th>Precio</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.map((product) => (
                          <tr key={product.id}>
                            <td data-label="Producto">
                              <strong>{product.nombre}</strong>
                              <small>{product.etiqueta || 'Online'}</small>
                            </td>
                            <td data-label="Categoría">{product.categoria}</td>
                            <td data-label="Tono">{product.tono}</td>
                            <td data-label="Stock">{formatInteger(product.stock)}</td>
                            <td data-label="Precio">{formatCurrency(product.precio)}</td>
                            <td data-label="Acciones">
                              <button
                                type="button"
                                className="admin-secondary-button admin-edit-btn"
                                onClick={() => handleEditClick(product)}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-pagination">
                    <button type="button" disabled={productPage === 0} onClick={() => setProductPage((p) => p - 1)}>← Anterior</button>
                    <span>Página {productPage + 1} de {productTotalPages} ({filteredProducts.length} resultados)</span>
                    <button type="button" disabled={productPage + 1 >= productTotalPages} onClick={() => setProductPage((p) => p + 1)}>Siguiente →</button>
                  </div>
                </>
              ) : (
                <div className="admin-empty-state compact">
                  <h3>Sin resultados</h3>
                  <p>{products.length > 0 ? 'No hay productos que coincidan con los filtros.' : 'El catálogo aparecerá aquí apenas existan productos.'}</p>
                </div>
              )}
            </section>
            )}

            {activeTab === 'envios' && (
            <>
              <section className="admin-kpi-grid admin-shipments-summary">
                <article className="admin-kpi-card">
                  <span className="admin-kpi-label">Pendientes</span>
                  <strong>{formatInteger(pendingShipments)}</strong>
                  <p>Órdenes por preparar y despachar</p>
                </article>
                <article className="admin-kpi-card">
                  <span className="admin-kpi-label">En camino</span>
                  <strong>{formatInteger(inTransitShipments)}</strong>
                  <p>Envíos marcados como enviados</p>
                </article>
                <article className="admin-kpi-card admin-kpi-card-accent">
                  <span className="admin-kpi-label">Entregados</span>
                  <strong>{formatInteger(deliveredShipments)}</strong>
                  <p>Órdenes completadas</p>
                </article>
              </section>

              <section className="admin-panel admin-shipments-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Gestión de envíos</p>
                    <h2>Direcciones y trazabilidad de órdenes</h2>
                  </div>
                </div>

                <div className="admin-table-controls">
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Buscar por cliente, email, dirección o # orden..."
                    value={shipmentSearch}
                    onChange={(e) => { setShipmentSearch(e.target.value); setShipmentPage(0); }}
                  />
                  <select
                    className="admin-filter-select"
                    value={shipmentStatusFilter}
                    onChange={(e) => { setShipmentStatusFilter(e.target.value); setShipmentPage(0); }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pago_confirmado">Pago confirmado</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </div>

                {paginatedShipments.length > 0 ? (
                  <>
                    <div className="admin-shipments-list">
                      {paginatedShipments.map((order) => {
                        const address = order.direccion_envio;
                        const addressLine = formatAddress(address);
                        const normalizedStatus = normalizeOrderStatus(order.estado);

                        return (
                          <article key={order.id} className="admin-shipment-card">
                            <div className="admin-shipment-main">
                              <div className="admin-shipment-heading">
                                <div>
                                  <span className="admin-shipment-order">Orden #{order.id}</span>
                                  <strong>{order.cliente}</strong>
                                  <small>{order.cliente_email || '—'}</small>
                                </div>
                                <span className={`admin-status-badge is-${normalizedStatus}`}>{getOrderStatusLabel(order.estado)}</span>
                              </div>

                              <div className="admin-shipment-address">
                                <span className="admin-shipment-label">Dirección de envío</span>
                                {addressLine ? (
                                  <>
                                    {address?.nombre_receptor && <p><strong>{address.nombre_receptor}</strong></p>}
                                    <p>{addressLine}</p>
                                    {(address?.telefono || order.cliente_telefono) && (
                                      <small>Tel: {address?.telefono || order.cliente_telefono}</small>
                                    )}
                                    {address?.referencia && <small>Ref: {address.referencia}</small>}
                                  </>
                                ) : (
                                  <p className="admin-shipment-empty">Sin dirección registrada para esta orden.</p>
                                )}
                              </div>

                              <div className="admin-shipment-footer">
                                <small>Total: {formatCurrency(order.total)}</small>
                                <small>{formatDate(order.creado_at)}</small>
                                <button
                                  type="button"
                                  className="admin-secondary-button admin-edit-btn"
                                  onClick={() => handleOrderClick(order.id)}
                                >
                                  Ver detalle
                                </button>
                              </div>
                            </div>

                            <div className="admin-shipment-track">
                              <span className="admin-shipment-label">Estado del envío</span>
                              <div className="admin-shipment-states">
                                {SHIPMENT_STATES.map((state) => {
                                  const isCurrent = normalizedStatus === state.id;
                                  return (
                                    <button
                                      key={state.id}
                                      type="button"
                                      className={`admin-shipment-state ${isCurrent ? 'is-active' : ''}`}
                                      disabled={isCurrent || updatingShipmentId === order.id}
                                      onClick={() => handleShipmentStatusChange(order.id, state.id)}
                                    >
                                      {updatingShipmentId === order.id && !isCurrent ? '...' : state.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="admin-pagination">
                      <button type="button" disabled={shipmentPage === 0} onClick={() => setShipmentPage((p) => p - 1)}>← Anterior</button>
                      <span>Página {shipmentPage + 1} de {shipmentTotalPages} ({filteredShipments.length} resultados)</span>
                      <button type="button" disabled={shipmentPage + 1 >= shipmentTotalPages} onClick={() => setShipmentPage((p) => p + 1)}>Siguiente →</button>
                    </div>
                  </>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Sin envíos</h3>
                    <p>{recentOrders.length > 0 ? 'No hay órdenes que coincidan con los filtros.' : 'Cuando se generen órdenes con dirección, aquí podrás gestionar los envíos.'}</p>
                  </div>
                )}
              </section>
            </>
            )}

            {activeTab === 'anuncios' && (
            <section className="admin-management-grid">
              <article className="admin-panel admin-announcements-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Anuncios emergentes</p>
                    <h2>Configura el carrusel de inicio</h2>
                  </div>
                </div>

                <p className="admin-announcement-help">Puedes registrar hasta 5 anuncios. Cada anuncio usa imagen por URL y estado activo/inactivo.</p>

                {announcements.length < 5 ? (
                  <form className="admin-product-form" onSubmit={handleCreateAnnouncement}>
                    <div className="admin-form-grid">
                      <label className="admin-field admin-field-wide">
                        <span>Imagen URL</span>
                        <input
                          type="url"
                          value={announcementForm.imagen_url}
                          onChange={(e) => setAnnouncementForm((current) => ({ ...current, imagen_url: e.target.value }))}
                          placeholder="https://..."
                          required
                        />
                      </label>

                      <label className="admin-field">
                        <span>Estado</span>
                        <select
                          value={announcementForm.estado}
                          onChange={(e) => setAnnouncementForm((current) => ({ ...current, estado: e.target.value }))}
                        >
                          <option value="activo">activo</option>
                          <option value="inactivo">inactivo</option>
                        </select>
                      </label>
                    </div>

                    <button type="submit" className="admin-primary-button" disabled={isCreatingAnnouncement}>
                      {isCreatingAnnouncement ? 'Guardando anuncio...' : 'Agregar anuncio'}
                    </button>
                  </form>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Límite alcanzado</h3>
                    <p>Ya tienes 5 anuncios. Edita uno existente para reutilizarlo.</p>
                  </div>
                )}
              </article>

              <article className="admin-panel admin-announcements-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Anuncios actuales</p>
                    <h2>Activar, desactivar o cambiar imágenes</h2>
                  </div>
                </div>

                {announcements.length > 0 ? (
                  <div className="admin-announcements-list">
                    {announcements.map((item) => {
                      const draft = announcementDrafts[item.id] || {
                        imagen_url: item.imagen_url,
                        estado: item.estado,
                      };

                      return (
                        <div key={item.id} className="admin-announcement-item">
                          <div className="admin-announcement-preview">
                            <img src={draft.imagen_url || item.imagen_url} alt={`Anuncio ${item.id}`} loading="lazy" referrerPolicy="no-referrer" />
                            <span className={`admin-status-badge is-${draft.estado}`}>{draft.estado}</span>
                          </div>

                          <div className="admin-announcement-controls">
                            <label className="admin-field admin-field-wide">
                              <span>Imagen URL</span>
                              <input
                                type="url"
                                value={draft.imagen_url}
                                onChange={(e) => setAnnouncementDrafts((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...draft,
                                    imagen_url: e.target.value,
                                  },
                                }))}
                              />
                            </label>

                            <label className="admin-field">
                              <span>Estado</span>
                              <select
                                value={draft.estado}
                                onChange={(e) => setAnnouncementDrafts((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...draft,
                                    estado: e.target.value,
                                  },
                                }))}
                              >
                                <option value="activo">activo</option>
                                <option value="inactivo">inactivo</option>
                              </select>
                            </label>

                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => handleSaveAnnouncement(item.id)}
                              disabled={savingAnnouncementId === item.id}
                            >
                              {savingAnnouncementId === item.id ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Sin anuncios</h3>
                    <p>Agrega anuncios para mostrarlos en el popup de inicio.</p>
                  </div>
                )}
              </article>
            </section>
            )}
          </>
        )}

        {selectedOrder && (
          <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="admin-modal admin-order-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-head">
                <h2>Orden #{selectedOrder}</h2>
                <button type="button" className="admin-modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>

              {loadingOrder ? (
                <div className="admin-empty-state compact">
                  <p>Cargando detalle de la orden...</p>
                </div>
              ) : orderDetail ? (
                <div className="admin-order-detail">
                  <div className="admin-order-detail-header">
                    <div>
                      <strong>{orderDetail.cliente}</strong>
                      <small>{orderDetail.cliente_email || '—'}</small>
                    </div>
                    <div className="admin-order-detail-meta">
                      <span className={`admin-status-badge is-${normalizeOrderStatus(orderDetail.estado)}`}>{getOrderStatusLabel(orderDetail.estado)}</span>
                      <small>{formatDate(orderDetail.creado_at)}</small>
                    </div>
                  </div>

                  <div className="admin-products-table-wrap">
                    <table className="admin-products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Cantidad</th>
                          <th>Precio unit.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetail.items.map((item) => (
                          <tr key={item.id}>
                            <td data-label="Producto">
                              <div className="admin-order-item-cell">
                                {item.imagen_url && (
                                  <img src={item.imagen_url} alt={item.nombre} className="admin-order-item-img" loading="lazy" referrerPolicy="no-referrer" />
                                )}
                                <strong>{item.nombre || 'Producto eliminado'}</strong>
                              </div>
                            </td>
                            <td data-label="Categoría">{item.categoria || '—'}</td>
                            <td data-label="Cantidad">{item.cantidad}</td>
                            <td data-label="Precio unit.">{formatCurrency(item.precio)}</td>
                            <td data-label="Subtotal">{formatCurrency(item.precio * item.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4" data-label="Total" style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                          <td data-label="Monto total"><strong>{formatCurrency(orderDetail.total)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="admin-modal-overlay" onClick={() => setEditingProduct(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-head">
                <h2>Editar producto</h2>
                <button type="button" className="admin-modal-close" onClick={() => setEditingProduct(null)}>✕</button>
              </div>
              <form className="admin-product-form" onSubmit={handleSaveEdit}>
                <div className="admin-form-grid">
                  <label className="admin-field admin-field-wide">
                    <span>Nombre</span>
                    <input type="text" name="nombre" value={editForm.nombre} onChange={handleEditFieldChange} required />
                  </label>
                  <label className="admin-field admin-field-wide">
                    <span>Descripción</span>
                    <textarea name="descripcion" value={editForm.descripcion} onChange={handleEditFieldChange} rows="3" />
                  </label>
                  <label className="admin-field">
                    <span>Precio (COP)</span>
                    <input type="number" min="1000" step="1000" name="precio" value={editForm.precio} onChange={handleEditFieldChange} required />
                  </label>
                  <label className="admin-field">
                    <span>Stock</span>
                    <input type="number" min="0" step="1" name="stock" value={editForm.stock} onChange={handleEditFieldChange} />
                  </label>
                  <label className="admin-field">
                    <span>Categoría</span>
                    <input type="text" name="categoria" value={editForm.categoria} onChange={handleEditFieldChange} />
                  </label>
                  <label className="admin-field">
                    <span>Tono</span>
                    <input type="text" name="tono" value={editForm.tono} onChange={handleEditFieldChange} />
                  </label>
                  <label className="admin-field">
                    <span>Material</span>
                    <input type="text" name="material" value={editForm.material} onChange={handleEditFieldChange} />
                  </label>
                  <label className="admin-field">
                    <span>Etiqueta</span>
                    <input type="text" name="etiqueta" value={editForm.etiqueta} onChange={handleEditFieldChange} />
                  </label>
                  <label className="admin-field admin-field-wide">
                    <span>Imagen URL</span>
                    <input type="url" name="imagen_url" value={editForm.imagen_url} onChange={handleEditFieldChange} />
                  </label>
                </div>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-secondary-button" onClick={() => setEditingProduct(null)}>Cancelar</button>
                  <button type="submit" className="admin-primary-button" disabled={isSavingEdit}>
                    {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminDashboardPage;
