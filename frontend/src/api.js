const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SESSION_STORAGE_KEY = 'azami-user';

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

async function request(endpoint, options = {}) {
  const { auth = false, headers: customHeaders = {}, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (auth) {
    const token = getStoredSession()?.token;

    if (!token) {
      throw new Error('Tu sesión no es válida. Inicia sesión nuevamente.');
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...fetchOptions,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la solicitud.');
  }

  return data;
}

export async function fetchProductos() {
  return request('/productos', { method: 'GET' });
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

export async function createAdminProducto(payload) {
  return request('/productos', {
    method: 'POST',
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
