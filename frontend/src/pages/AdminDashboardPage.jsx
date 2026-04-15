import { useEffect, useState } from 'react';
import { createAdminProducto, fetchAdminDashboard, updateUsuarioRol } from '../api.js';
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

function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

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

function buildRoleDrafts(users) {
  return Object.fromEntries(users.map((account) => [account.id, account.rol]));
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

  const loadDashboard = async ({ showLoader = false } = {}) => {
    if (showLoader || !dashboard) {
      setLoading(true);
    }

    setDashboardError('');

    try {
      const data = await fetchAdminDashboard();
      setDashboard(data);
      setRoleDrafts(buildRoleDrafts(data.users || []));
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
  const lowStockRatio = metrics.totalProducts > 0 ? Math.round((metrics.lowStockProducts / metrics.totalProducts) * 100) : 0;
  const adminCoverage = metrics.totalUsers > 0 ? Math.round((metrics.totalAdmins / metrics.totalUsers) * 100) : 0;
  const maxCategoryStock = Math.max(...categoryBreakdown.map((category) => Number(category.stockTotal || 0)), 1);

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

            <section className="admin-report-grid admin-report-grid-secondary">
              <article className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Ventas recientes</p>
                    <h2>Actividad de órdenes</h2>
                  </div>
                </div>

                {recentOrders.length > 0 ? (
                  <div className="admin-orders-list">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="admin-order-item">
                        <div>
                          <strong>Orden #{order.id}</strong>
                          <p>{order.cliente}</p>
                        </div>
                        <div className="admin-order-meta">
                          <span>{formatCurrency(order.total)}</span>
                          <small>{formatDate(order.creado_at)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <h3>Sin órdenes registradas</h3>
                    <p>Cuando se generen ventas, aquí verás la actividad más reciente.</p>
                  </div>
                )}
              </article>

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
            </section>

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
                      <span>Precio</span>
                      <input type="number" min="1" step="0.01" name="precio" value={productForm.precio} onChange={handleProductFieldChange} placeholder="180" required />
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

            <section className="admin-panel admin-products-panel">
              <div className="admin-panel-head">
                <div>
                  <p className="admin-panel-kicker">Catálogo activo</p>
                  <h2>Referencia rápida de inventario</h2>
                </div>
              </div>

              <div className="admin-products-table-wrap">
                <table className="admin-products-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Tono</th>
                      <th>Stock</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.nombre}</strong>
                          <small>{product.etiqueta || 'Online'}</small>
                        </td>
                        <td>{product.categoria}</td>
                        <td>{product.tono}</td>
                        <td>{formatInteger(product.stock)}</td>
                        <td>{formatCurrency(product.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default AdminDashboardPage;
