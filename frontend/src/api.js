const API_URL = import.meta.env.VITE_API_URL || 'https://e-commerceproject-production-1031.up.railway.app/api';
const SESSION_STORAGE_KEY = 'azami-user';

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function updateStoredToken(newToken) {
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    parsed.token = newToken;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

// Intenta renovar el access token usando el refresh token de la cookie httpOnly.
// Devuelve el nuevo access token o null si la cookie ya expiró.
let refreshPromise = null;
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${API_URL}/usuarios/refresh-token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = await r.json();
      if (data.token) {
        updateStoredToken(data.token);
        // Notifica a App.jsx para que actualice el estado del usuario
        window.dispatchEvent(new CustomEvent('azami-token-refreshed', { detail: data }));
        return data.token;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => { refreshPromise = null; });

  return refreshPromise;
}

async function request(endpoint, options = {}, _isRetry = false) {
  const { auth = false, headers: customHeaders = {}, responseType = 'json', ...fetchOptions } = options;
  const headers = {
    ...customHeaders,
  };
  const isFormData = isFormDataBody(fetchOptions.body);

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getStoredSession()?.token;

    if (!token) {
      throw new Error('Tu sesión no es válida. Inicia sesión nuevamente.');
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    credentials: 'include',
    ...fetchOptions,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { error: text };
    });

    // Si es 401 en una request autenticada, intentar renovar el access token
    if (response.status === 401 && auth && !_isRetry) {
      const newToken = await tryRefresh();
      if (newToken) {
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        return request(endpoint, { ...options, headers: retryHeaders }, true);
      }
      // El refresh también falló → cerrar sesión
      window.dispatchEvent(new Event('azami-session-expired'));
    }
    throw new Error(errorData.error || 'No se pudo completar la solicitud.');
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text();
  }

  return response.json().catch(() => ({}));
}

export async function fetchProductos() {
  return request('/productos', { method: 'GET' });
}

export async function createGuestOrder(payload) {
  return request('/checkout/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCheckoutQuote(payload) {
  return request('/checkout/quote', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchWompiWidgetConfig(payload) {
  return request('/checkout/wompi/widget', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchWompiTransaction(transactionId) {
  return request(`/checkout/wompi/transactions/${encodeURIComponent(transactionId)}`, {
    method: 'GET',
  });
}

export async function registerUsuario(payload) {
  return request('/usuarios/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUsuario(payload) {
  return request('/usuarios/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminDashboard() {
  return request('/admin/dashboard', {
    method: 'GET',
    auth: true,
  });
}

export async function fetchActiveAnnouncements() {
  return request('/anuncios/active', {
    method: 'GET',
  });
}

// ── CMS public ────────────────────────────────────────────────────────────────
export async function fetchCmsFilters() {
  return request('/cms/filters', { method: 'GET' });
}
export async function fetchCmsContent() {
  return request('/cms/content', { method: 'GET' });
}
export async function fetchCmsCarousel() {
  return request('/cms/carousel', { method: 'GET' });
}

// ── CMS admin ─────────────────────────────────────────────────────────────────
export async function fetchAdminCmsFilters() {
  return request('/admin/cms/filters', { method: 'GET', auth: true });
}
export async function addAdminCmsFilter(payload) {
  return request('/admin/cms/filters', { method: 'POST', auth: true, body: JSON.stringify(payload) });
}
export async function deleteAdminCmsFilter(id) {
  return request(`/admin/cms/filters/${id}`, { method: 'DELETE', auth: true });
}
export async function fetchAdminCmsContent() {
  return request('/admin/cms/content', { method: 'GET', auth: true });
}
export async function saveAdminCmsContent(items) {
  return request('/admin/cms/content', { method: 'POST', auth: true, body: JSON.stringify(items) });
}
export async function fetchAdminCmsCarousel() {
  return request('/admin/cms/carousel', { method: 'GET', auth: true });
}
export async function addAdminCmsSlide(payload) {
  return request('/admin/cms/carousel', { method: 'POST', auth: true, body: JSON.stringify(payload) });
}
export async function updateAdminCmsSlide(id, payload) {
  return request(`/admin/cms/carousel/${id}`, { method: 'PUT', auth: true, body: JSON.stringify(payload) });
}
export async function deleteAdminCmsSlide(id) {
  return request(`/admin/cms/carousel/${id}`, { method: 'DELETE', auth: true });
}

export async function fetchAdminDiscountRules() {
  return request('/admin/discount-rules', { method: 'GET', auth: true });
}

export async function createAdminDiscountRule(payload) {
  return request('/admin/discount-rules', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateAdminDiscountRule(ruleId, payload) {
  return request(`/admin/discount-rules/${ruleId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createAdminProducto(payload) {
  return request('/productos', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProducto(productId, payload) {
  return request(`/productos/${productId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateUsuarioRol(userId, rol) {
  return request(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ rol }),
  });
}

export async function fetchOrderDetail(orderId) {
  return request(`/admin/orders/${orderId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function updateOrderStatus(orderId, estado) {
  return request(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ estado }),
  });
}

export async function createAdminAnnouncement(payload) {
  return request('/admin/announcements', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateAdminAnnouncement(announcementId, payload) {
  return request(`/admin/announcements/${announcementId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function downloadOfflineSalesTemplate() {
  return request('/admin/offline-sales/template', {
    method: 'GET',
    auth: true,
    responseType: 'blob',
  });
}

export async function importOfflineSalesWorkbook(formData) {
  return request('/admin/offline-sales/import', {
    method: 'POST',
    auth: true,
    body: formData,
  });
}

export async function forgotPassword(payload) {
  return request('/usuarios/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload) {
  return request('/usuarios/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutApi() {
  return request('/usuarios/logout', { method: 'POST' });
}

// ─── Cuenta del usuario ───────────────────────────────────────────────────────

export async function fetchMyProfile() {
  return request('/cuenta/profile', { method: 'GET', auth: true });
}

export async function updateMyProfile(payload) {
  return request('/cuenta/profile', { method: 'PUT', auth: true, body: JSON.stringify(payload) });
}

export async function changePassword(payload) {
  return request('/cuenta/password', { method: 'PUT', auth: true, body: JSON.stringify(payload) });
}

export async function fetchMyOrders() {
  return request('/cuenta/orders', { method: 'GET', auth: true });
}

export async function createMyOrder(payload) {
  return request('/cuenta/orders', { method: 'POST', auth: true, body: JSON.stringify(payload) });
}

export async function fetchMyAddresses() {
  return request('/cuenta/addresses', { method: 'GET', auth: true });
}

export async function createAddress(payload) {
  return request('/cuenta/addresses', { method: 'POST', auth: true, body: JSON.stringify(payload) });
}

export async function updateAddressApi(addressId, payload) {
  return request(`/cuenta/addresses/${addressId}`, { method: 'PUT', auth: true, body: JSON.stringify(payload) });
}

export async function deleteAddressApi(addressId) {
  return request(`/cuenta/addresses/${addressId}`, { method: 'DELETE', auth: true });
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('imagen', file);
  return request('/admin/upload-image', {
    method: 'POST',
    auth: true,
    body: formData,
  });
}
