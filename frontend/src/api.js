const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchProductos() {
  const response = await fetch(`${API_URL}/productos`);
  if (!response.ok) {
    throw new Error('Error al obtener productos');
  }
  return response.json();
}
