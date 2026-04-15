const curatedFallbackImages = [
  'https://images.pexels.com/photos/36365230/pexels-photo-36365230.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/5706269/pexels-photo-5706269.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/32498584/pexels-photo-32498584.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1204464/pexels-photo-1204464.jpeg?auto=compress&cs=tinysrgb&w=1600'
];

export const curatedProducts = [
  {
    id: 'curated-1',
    nombre: 'Tote Hana',
    descripcion: 'Tote estructurado con interior amplio y caída limpia para jornadas largas.',
    precio: 268,
    imagen_url: curatedFallbackImages[0],
    stock: 6,
    categoria: 'Tote',
    tono: 'Crema',
    material: 'Cuero graneado',
    etiqueta: 'Best seller'
  },
  {
    id: 'curated-2',
    nombre: 'Mini Kaori',
    descripcion: 'Mini bag con asa corta y perfil preciso para estilismos editoriales.',
    precio: 214,
    imagen_url: curatedFallbackImages[1],
    stock: 4,
    categoria: 'Mini bag',
    tono: 'Marfil',
    material: 'Cuero liso',
    etiqueta: 'Nuevo'
  },
  {
    id: 'curated-3',
    nombre: 'Satchel Noa',
    descripcion: 'Satchel de contraste sobrio con compartimentos internos y herraje suave.',
    precio: 289,
    imagen_url: curatedFallbackImages[2],
    stock: 3,
    categoria: 'Satchel',
    tono: 'Negro',
    material: 'Cuero pulido',
    etiqueta: 'Edición cápsula'
  },
  {
    id: 'curated-4',
    nombre: 'Shoulder Airi',
    descripcion: 'Shoulder bag compacta con volumen suave pensada para uso diario.',
    precio: 236,
    imagen_url: curatedFallbackImages[3],
    stock: 7,
    categoria: 'Shoulder',
    tono: 'Borgoña',
    material: 'Napa flexible',
    etiqueta: 'Restock'
  },
  {
    id: 'curated-5',
    nombre: 'Crossbody Sora',
    descripcion: 'Crossbody con cadena fina y silueta vertical para trayectos ligeros.',
    precio: 248,
    imagen_url: curatedFallbackImages[4],
    stock: 5,
    categoria: 'Crossbody',
    tono: 'Crema',
    material: 'Cuero semi mate',
    etiqueta: 'Favorito'
  },
  {
    id: 'curated-6',
    nombre: 'Bucket Rei',
    descripcion: 'Bucket de perfil limpio con correa regulable y cierre interior seguro.',
    precio: 258,
    imagen_url: curatedFallbackImages[5],
    stock: 2,
    categoria: 'Bucket',
    tono: 'Negro',
    material: 'Cuero natural',
    etiqueta: 'Icono'
  }
];

const remoteCategories = ['Selección online', 'Colección atelier', 'Drop limitado'];
const remoteTones = ['Crema', 'Marfil', 'Negro', 'Borgoña'];
const remoteMaterials = ['Selección Azami', 'Cuero premium', 'Edición online'];

export function normalizeRemoteProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products.map((product, index) => ({
    id: `remote-${product.id ?? index}`,
    nombre: product.nombre || `Producto ${index + 1}`,
    descripcion: product.descripcion || 'Pieza disponible en el catálogo en vivo de Azami.',
    precio: Number(product.precio) || 0,
    imagen_url: product.imagen_url || curatedFallbackImages[index % curatedFallbackImages.length],
    stock: Number(product.stock) || 0,
    categoria: product.categoria || remoteCategories[index % remoteCategories.length],
    tono: product.tono || remoteTones[index % remoteTones.length],
    material: product.material || remoteMaterials[index % remoteMaterials.length],
    etiqueta: product.etiqueta || 'Online'
  }));
}