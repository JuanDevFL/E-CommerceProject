import { normalizePrice } from '../utils/pricing.js';

const curatedFallbackImages = [
  'https://images.pexels.com/photos/36365230/pexels-photo-36365230.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/5706269/pexels-photo-5706269.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/32498584/pexels-photo-32498584.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1204464/pexels-photo-1204464.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2002717/pexels-photo-2002717.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1204464/pexels-photo-1204464.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2002717/pexels-photo-2002717.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/36365230/pexels-photo-36365230.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/23223842/pexels-photo-23223842.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/7953286/pexels-photo-7953286.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/5706269/pexels-photo-5706269.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/32498584/pexels-photo-32498584.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1204464/pexels-photo-1204464.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1600'
];

const curatedProductBase = [
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
  },
  {
    id: 'curated-7',
    nombre: 'Clutch Yuki',
    descripcion: 'Clutch minimalista con cierre magnético y acabado satinado para eventos.',
    precio: 195,
    imagen_url: curatedFallbackImages[6],
    stock: 8,
    categoria: 'Clutch',
    tono: 'Marfil',
    material: 'Cuero liso',
    etiqueta: 'Nuevo'
  },
  {
    id: 'curated-8',
    nombre: 'Tote Akemi',
    descripcion: 'Tote oversize con doble asa y bolsillo interior con cremallera.',
    precio: 312,
    imagen_url: curatedFallbackImages[7],
    stock: 3,
    categoria: 'Tote',
    tono: 'Negro',
    material: 'Cuero graneado',
    etiqueta: 'Premium'
  },
  {
    id: 'curated-9',
    nombre: 'Crossbody Mika',
    descripcion: 'Crossbody compacta con cadena dorada y solapa redondeada.',
    precio: 228,
    imagen_url: curatedFallbackImages[8],
    stock: 5,
    categoria: 'Crossbody',
    tono: 'Borgoña',
    material: 'Napa flexible',
    etiqueta: 'Favorito'
  },
  {
    id: 'curated-10',
    nombre: 'Shoulder Emi',
    descripcion: 'Shoulder bag con cierre de giro y perfil elegante para el día a día.',
    precio: 254,
    imagen_url: curatedFallbackImages[9],
    stock: 4,
    categoria: 'Shoulder',
    tono: 'Crema',
    material: 'Cuero semi mate',
    etiqueta: 'Best seller'
  },
  {
    id: 'curated-11',
    nombre: 'Mini Sakura',
    descripcion: 'Mini bag con detalle floral grabado y asa desmontable.',
    precio: 198,
    imagen_url: curatedFallbackImages[10],
    stock: 6,
    categoria: 'Mini bag',
    tono: 'Marfil',
    material: 'Cuero pulido',
    etiqueta: 'Edición cápsula'
  },
  {
    id: 'curated-12',
    nombre: 'Satchel Rumi',
    descripcion: 'Satchel clásico con doble compartimento y acabado vintage.',
    precio: 298,
    imagen_url: curatedFallbackImages[11],
    stock: 2,
    categoria: 'Satchel',
    tono: 'Negro',
    material: 'Cuero natural',
    etiqueta: 'Icono'
  },
  {
    id: 'curated-13',
    nombre: 'Hobo Kana',
    descripcion: 'Hobo bag de silueta curva con interior forrado y cierre superior.',
    precio: 276,
    imagen_url: curatedFallbackImages[12],
    stock: 4,
    categoria: 'Hobo',
    tono: 'Borgoña',
    material: 'Napa flexible',
    etiqueta: 'Nuevo'
  },
  {
    id: 'curated-14',
    nombre: 'Clutch Amaya',
    descripcion: 'Clutch rígido con cierre de marco dorado y forro de seda.',
    precio: 210,
    imagen_url: curatedFallbackImages[13],
    stock: 5,
    categoria: 'Clutch',
    tono: 'Crema',
    material: 'Cuero liso',
    etiqueta: 'Restock'
  },
  {
    id: 'curated-15',
    nombre: 'Tote Misaki',
    descripcion: 'Tote reversible con dos acabados: liso exterior y gamuza interior.',
    precio: 342,
    imagen_url: curatedFallbackImages[14],
    stock: 3,
    categoria: 'Tote',
    tono: 'Negro',
    material: 'Cuero premium',
    etiqueta: 'Premium'
  },
  {
    id: 'curated-16',
    nombre: 'Bucket Yua',
    descripcion: 'Bucket con cierre de cordón y detalle de herraje minimalista.',
    precio: 245,
    imagen_url: curatedFallbackImages[15],
    stock: 7,
    categoria: 'Bucket',
    tono: 'Marfil',
    material: 'Cuero graneado',
    etiqueta: 'Favorito'
  },
  {
    id: 'curated-17',
    nombre: 'Crossbody Hina',
    descripcion: 'Crossbody ultra ligera con correa ajustable y bolsillo frontal.',
    precio: 218,
    imagen_url: curatedFallbackImages[16],
    stock: 9,
    categoria: 'Crossbody',
    tono: 'Crema',
    material: 'Cuero semi mate',
    etiqueta: 'Best seller'
  },
  {
    id: 'curated-18',
    nombre: 'Shoulder Izumi',
    descripcion: 'Shoulder bag estructurada con base rígida y asa de cadena gruesa.',
    precio: 268,
    imagen_url: curatedFallbackImages[17],
    stock: 3,
    categoria: 'Shoulder',
    tono: 'Borgoña',
    material: 'Cuero pulido',
    etiqueta: 'Edición cápsula'
  },
  {
    id: 'curated-19',
    nombre: 'Hobo Tsubaki',
    descripcion: 'Hobo de formato medio con interior organizado y asa suave.',
    precio: 265,
    imagen_url: curatedFallbackImages[18],
    stock: 4,
    categoria: 'Hobo',
    tono: 'Negro',
    material: 'Napa flexible',
    etiqueta: 'Nuevo'
  },
  {
    id: 'curated-20',
    nombre: 'Mini Fumiko',
    descripcion: 'Mini bag con asa de anilla metálica y cierre de imán oculto.',
    precio: 205,
    imagen_url: curatedFallbackImages[19],
    stock: 6,
    categoria: 'Mini bag',
    tono: 'Crema',
    material: 'Cuero liso',
    etiqueta: 'Restock'
  },
  {
    id: 'curated-21',
    nombre: 'Satchel Koharu',
    descripcion: 'Satchel con asa superior y bandolera desmontable en tono neutro.',
    precio: 305,
    imagen_url: curatedFallbackImages[20],
    stock: 2,
    categoria: 'Satchel',
    tono: 'Marfil',
    material: 'Cuero natural',
    etiqueta: 'Icono'
  },
  {
    id: 'curated-22',
    nombre: 'Tote Chiyo',
    descripcion: 'Tote de formato A4 con refuerzo lateral y cierre de cremallera.',
    precio: 278,
    imagen_url: curatedFallbackImages[21],
    stock: 5,
    categoria: 'Tote',
    tono: 'Negro',
    material: 'Cuero graneado',
    etiqueta: 'Premium'
  },
  {
    id: 'curated-23',
    nombre: 'Crossbody Natsumi',
    descripcion: 'Crossbody con solapa angular y cierre de giro en acabado mate.',
    precio: 235,
    imagen_url: curatedFallbackImages[22],
    stock: 7,
    categoria: 'Crossbody',
    tono: 'Borgoña',
    material: 'Cuero semi mate',
    etiqueta: 'Favorito'
  },
  {
    id: 'curated-24',
    nombre: 'Bucket Asami',
    descripcion: 'Bucket con estructura flexible y bolsillo interior con zipper.',
    precio: 252,
    imagen_url: curatedFallbackImages[23],
    stock: 4,
    categoria: 'Bucket',
    tono: 'Crema',
    material: 'Napa flexible',
    etiqueta: 'Best seller'
  },
  {
    id: 'curated-25',
    nombre: 'Clutch Harumi',
    descripcion: 'Clutch de noche con textura tejida y cierre de pedrería sutil.',
    precio: 225,
    imagen_url: curatedFallbackImages[24],
    stock: 3,
    categoria: 'Clutch',
    tono: 'Negro',
    material: 'Cuero pulido',
    etiqueta: 'Edición cápsula'
  },
  {
    id: 'curated-26',
    nombre: 'Hobo Rina',
    descripcion: 'Hobo de formato amplio con caída natural y asa de hombro acolchada.',
    precio: 288,
    imagen_url: curatedFallbackImages[25],
    stock: 5,
    categoria: 'Hobo',
    tono: 'Marfil',
    material: 'Cuero natural',
    etiqueta: 'Nuevo'
  }
];

export const curatedProducts = curatedProductBase.map((product) => ({
  ...product,
  backendId: null,
  precio: normalizePrice(product.precio),
}));

const remoteCategories = ['Selección online', 'Colección atelier', 'Drop limitado'];
const remoteTones = ['Crema', 'Marfil', 'Negro', 'Borgoña'];
const remoteMaterials = ['Selección Azami', 'Cuero premium', 'Edición online'];

export function normalizeRemoteProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products.map((product, index) => ({
    id: `remote-${product.id ?? index}`,
    backendId: Number(product.id) || null,
    nombre: product.nombre || `Producto ${index + 1}`,
    descripcion: product.descripcion || 'Pieza disponible en el catálogo en vivo de Azami.',
    precio: normalizePrice(product.precio),
    imagen_url: product.imagen_url || curatedFallbackImages[index % curatedFallbackImages.length],
    stock: Number(product.stock) || 0,
    categoria: product.categoria || remoteCategories[index % remoteCategories.length],
    tono: product.tono || remoteTones[index % remoteTones.length],
    material: product.material || remoteMaterials[index % remoteMaterials.length],
    etiqueta: product.etiqueta || 'Online'
  }));
}