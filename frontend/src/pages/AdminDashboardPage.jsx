import { useEffect, useRef, useState } from 'react';
import {
  createAdminAnnouncement,
  createAdminProducto,
  downloadOfflineSalesTemplate,
  fetchAdminDashboard,
  fetchOrderDetail,
  importOfflineSalesWorkbook,
  updateAdminAnnouncement,
  updateAdminProducto,
  updateOrderStatus,
  uploadProductImage,
  updateUsuarioRol,
  fetchAdminCmsFilters,
  addAdminCmsFilter,
  deleteAdminCmsFilter,
  fetchAdminCmsContent,
  saveAdminCmsContent,
  fetchAdminCmsCarousel,
  addAdminCmsSlide,
  updateAdminCmsSlide,
  deleteAdminCmsSlide,
  fetchAdminDiscountRules,
  createAdminDiscountRule,
  updateAdminDiscountRule,
} from '../api.js';
import { formatPrice as formatCurrency, normalizePrice } from '../utils/pricing.js';
import './AdminDashboardPage.css';

const initialProductForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  imagen_url: '',
  imagen_url_2: '',
  imagen_url_3: '',
  color_variants_text: '',
  stock: '0',
  categoria: '',
  tono: '',
  material: '',
  etiqueta: '',
};

const pruebaImgPreset = {
  nombre: 'PRUEBA IMG',
  descripcion: 'Producto demo para validar mini carrusel y cambio de imagen al seleccionar color.',
  precio: '299000',
  imagen_url: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
  imagen_url_2: 'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
  imagen_url_3: 'https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
  color_variants_text: [
    'Negro|#121212|https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'Marfil|#F6F0E6|https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'Verde oliva|#556B2F|https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
  ].join('\n'),
  stock: '12',
  categoria: 'Cross Body',
  tono: 'Negro',
  material: 'Cuero premium',
  etiqueta: 'Prueba carousel',
};

const pruebaImgColorVariantForms = [
  {
    nombre: 'Negro',
    hex: '#121212',
    imagen_url: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_2: 'https://images.pexels.com/photos/12113999/pexels-photo-12113999.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_3: 'https://images.pexels.com/photos/17115369/pexels-photo-17115369.jpeg?auto=compress&cs=tinysrgb&w=1600',
  },
  {
    nombre: 'Marfil',
    hex: '#F6F0E6',
    imagen_url: 'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_2: 'https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_3: 'https://images.pexels.com/photos/32498584/pexels-photo-32498584.jpeg?auto=compress&cs=tinysrgb&w=1600',
  },
  {
    nombre: 'Verde oliva',
    hex: '#556B2F',
    imagen_url: 'https://images.pexels.com/photos/1374910/pexels-photo-1374910.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_2: 'https://images.pexels.com/photos/2371502/pexels-photo-2371502.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imagen_url_3: 'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1600',
  },
];

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

function formatLabel(value, fallback = 'Sin dato') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return fallback;
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
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
  { id: 'analitica',  label: 'Analítica' },
  { id: 'ventas',     label: 'Ventas' },
  { id: 'productos',  label: 'Productos' },
  { id: 'envios',     label: 'Envíos' },
  { id: 'anuncios',   label: 'Anuncios' },
  { id: 'contenido',  label: 'Contenido' },
];

const SHIPMENT_STATES = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'entregado', label: 'Entregado' },
];

const CMS_CONTENT_HELP = {
  'home.hero_titulo': 'Inicio: Título principal del hero',
  'home.hero_tagline': 'Inicio: Línea corta bajo el título principal',
  'home.hero_subtitulo': 'Inicio: Párrafo descriptivo del hero',
  'home.hero_cta': 'Inicio: Texto del botón principal',
  'catalogo.eyebrow': 'Catálogo: Etiqueta superior de la sección',
  'catalogo.titulo': 'Catálogo: Título principal del catálogo',
  'catalogo.descripcion': 'Catálogo: Descripción introductoria de la sección',
  'about.titulo': 'Nosotros: Título principal',
  'about.subtitulo': 'Nosotros: Subtítulo principal',
  'about.descripcion': 'Nosotros: Descripción principal',
  'contacto.email': 'Contacto: Correo de atención',
  'contacto.whatsapp': 'Contacto: Número de WhatsApp',
};

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
    cancelado: 'Pago cancelado',
  };

  return labels[normalized] || String(status || 'Sin estado');
}

function buildImageUrlsFromForm(form) {
  const urls = [form.imagen_url, form.imagen_url_2, form.imagen_url_3]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const unique = [...new Set(urls)].slice(0, 3);
  if (!unique.length) return [];
  while (unique.length < 3) {
    unique.push(unique[unique.length - 1]);
  }
  return unique;
}

function parseColorVariantsText(rawText, fallbackImage, fallbackTone) {
  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines
    .map((line) => {
      const [nombre, hex, imagen] = line.split('|').map((part) => String(part || '').trim());
      if (!nombre) return null;
      return {
        nombre,
        hex: hex || '',
        imagen_url: imagen || fallbackImage || '',
      };
    })
    .filter(Boolean);

  if (parsed.length > 0) {
    return parsed;
  }

  if (fallbackTone || fallbackImage) {
    return [{
      nombre: fallbackTone || 'Base',
      hex: '',
      imagen_url: fallbackImage || '',
    }];
  }

  return [];
}

function variantsToText(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return '';
  return variants
    .map((variant) => {
      const nombre = String(variant.nombre || '').trim();
      const hex = String(variant.hex || '').trim();
      const imagen = String(variant.imagen_url || '').trim();
      if (!nombre) return null;
      return [nombre, hex, imagen].join('|');
    })
    .filter(Boolean)
    .join('\n');
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createEmptyColorVariantForm(index = 1) {
  return {
    nombre: `Color ${index}`,
    hex: '',
    imagen_url: '',
    imagen_url_2: '',
    imagen_url_3: '',
  };
}

function imageFieldByIndex(imageIndex) {
  if (imageIndex === 1) return 'imagen_url_2';
  if (imageIndex === 2) return 'imagen_url_3';
  return 'imagen_url';
}

function buildImageUrlsFromVariantForm(variantForm) {
  const urls = [variantForm.imagen_url, variantForm.imagen_url_2, variantForm.imagen_url_3]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set(urls)].slice(0, 3);
}

function normalizeVariantForms(rawVariants, fallbackUrls = [], fallbackTone = '') {
  const forms = (Array.isArray(rawVariants) ? rawVariants : [])
    .map((variant, index) => {
      const localUrls = buildImageUrlsFromVariantForm({
        imagen_url: variant?.imagen_url,
        imagen_url_2: '',
        imagen_url_3: '',
      });
      const embeddedUrls = parseJsonArray(variant?.image_urls)
        .map((url) => String(url || '').trim())
        .filter(Boolean);
      const merged = [...new Set([...embeddedUrls, ...localUrls, ...fallbackUrls])].slice(0, 3);

      return {
        nombre: String(variant?.nombre || variant?.name || `Color ${index + 1}`).trim(),
        hex: String(variant?.hex || '').trim(),
        imagen_url: merged[0] || '',
        imagen_url_2: merged[1] || '',
        imagen_url_3: merged[2] || '',
      };
    })
    .filter((variant) => String(variant.nombre || '').trim());

  if (forms.length > 0) {
    return forms;
  }

  const mergedFallback = [...new Set((fallbackUrls || []).map((url) => String(url || '').trim()).filter(Boolean))].slice(0, 3);
  return [{
    nombre: String(fallbackTone || 'Color 1').trim() || 'Color 1',
    hex: '',
    imagen_url: mergedFallback[0] || '',
    imagen_url_2: mergedFallback[1] || '',
    imagen_url_3: mergedFallback[2] || '',
  }];
}

function buildProductMediaPayload(variantForms, fallbackTone = '') {
  const normalized = (Array.isArray(variantForms) ? variantForms : [])
    .map((variant, index) => {
      const nombre = String(variant.nombre || '').trim() || `Color ${index + 1}`;
      const hex = String(variant.hex || '').trim();
      const urls = buildImageUrlsFromVariantForm(variant);
      return {
        nombre,
        hex,
        image_urls: urls,
        imagen_url: urls[0] || '',
      };
    })
    .filter((variant) => variant.nombre);

  if (normalized.length === 0) {
    return {
      tono: String(fallbackTone || 'Color 1').trim() || 'Color 1',
      imagen_url: '',
      image_urls: [],
      color_variants: [{
        nombre: String(fallbackTone || 'Color 1').trim() || 'Color 1',
        hex: '',
        imagen_url: '',
        image_urls: [],
      }],
    };
  }

  const firstWithImages = normalized.find((variant) => variant.image_urls.length > 0);
  const baseGallery = firstWithImages
    ? firstWithImages.image_urls
    : [...new Set(normalized.map((variant) => variant.imagen_url).filter(Boolean))].slice(0, 3);

  return {
    tono: normalized[0].nombre || String(fallbackTone || 'Color 1').trim() || 'Color 1',
    imagen_url: baseGallery[0] || '',
    image_urls: baseGallery,
    color_variants: normalized.map((variant) => ({
      nombre: variant.nombre,
      hex: variant.hex,
      imagen_url: variant.imagen_url,
      image_urls: variant.image_urls,
    })),
  };
}

function isValidHexColor(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value || '').trim());
}

function AdminDashboardPage({ user, onProductCreated }) {
  const offlineSalesInputRef = useRef(null);
  const createImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  const createAnnouncementImageInputRef = useRef(null);
  const editAnnouncementImageInputRefs = useRef({});
  const [dashboard, setDashboard] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [productForm, setProductForm] = useState(initialProductForm);
  const [createColorVariants, setCreateColorVariants] = useState([createEmptyColorVariantForm(1)]);
  const [activeCreateColorIndex, setActiveCreateColorIndex] = useState(0);
  const [pendingCreateImageSlot, setPendingCreateImageSlot] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(initialProductForm);
  const [editColorVariants, setEditColorVariants] = useState([createEmptyColorVariantForm(1)]);
  const [activeEditColorIndex, setActiveEditColorIndex] = useState(0);
  const [pendingEditImageSlot, setPendingEditImageSlot] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ imagen_url: '', estado: 'activo' });
  const [announcementDrafts, setAnnouncementDrafts] = useState({});
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [savingAnnouncementId, setSavingAnnouncementId] = useState(null);
  const [offlineSalesFile, setOfflineSalesFile] = useState(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportingOfflineSales, setIsImportingOfflineSales] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [activeTab, setActiveTab] = useState('analitica');
  const [updatingShipmentId, setUpdatingShipmentId] = useState(null);

  // ── CMS state ─────────────────────────────────────────────────────────────
  const [cmsFilters, setCmsFilters]         = useState(null);
  const [cmsContent, setCmsContent]         = useState(null);
  const [cmsCarousel, setCmsCarousel]       = useState(null);
  const [cmsLoading, setCmsLoading]         = useState(false);
  const [cmsNewFilter, setCmsNewFilter]     = useState({ tipo: 'categoria', valor: '' });
  const [cmsNewSlide, setCmsNewSlide]       = useState({ eyebrow: '', titulo: '', descripcion: '', imagen_url: '', orden: 0 });
  const [cmsEditSlide, setCmsEditSlide]     = useState(null);
  const [cmsContentEdits, setCmsContentEdits] = useState({});
  const [cmsSaving, setCmsSaving]           = useState(false);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState('all');
  const [shipmentPage, setShipmentPage] = useState(0);
  const [hoveredTimelineDay, setHoveredTimelineDay] = useState(null);
  const [discountRules, setDiscountRules] = useState([]);
  const [discountForm, setDiscountForm] = useState({
    nombre: '',
    tipo: 'quantity',
    min_order_value: '0',
    min_quantity: '2',
    discount_percent: '10',
    max_uses_per_user: '',
    activo: true,
    prioridad: '100',
  });
  const [savingDiscountId, setSavingDiscountId] = useState(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(0);

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productPage, setProductPage] = useState(0);

  const PAGE_SIZE = 10;

  const notifyCmsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('azami-cms-updated'));
    }
  };

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

  // Carga CMS cuando el usuario abre el tab Contenido
  useEffect(() => {
    if (activeTab !== 'contenido' || cmsFilters !== null) return;
    setCmsLoading(true);
    Promise.all([fetchAdminCmsFilters(), fetchAdminCmsContent(), fetchAdminCmsCarousel(), fetchAdminDiscountRules()])
      .then(([filters, content, carousel, rulesResponse]) => {
        setCmsFilters(filters);
        setCmsContent(content);
        const edits = {};
        for (const [sec, claves] of Object.entries(content)) {
          for (const [clave, obj] of Object.entries(claves)) {
            edits[`${sec}.${clave}`] = obj.valor;
          }
        }
        setCmsContentEdits(edits);
        setCmsCarousel(carousel);
        setDiscountRules(Array.isArray(rulesResponse?.rules) ? rulesResponse.rules : []);
      })
      .catch(() => setActionError('No se pudo cargar el contenido CMS.'))
      .finally(() => setCmsLoading(false));
  }, [activeTab, cmsFilters]);

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
      const mediaPayload = buildProductMediaPayload(createColorVariants, productForm.tono);
      const payload = {
        ...productForm,
        tono: mediaPayload.tono,
        imagen_url: mediaPayload.imagen_url,
        image_urls: mediaPayload.image_urls,
        color_variants: mediaPayload.color_variants,
        precio: Number(productForm.precio),
        stock: Number(productForm.stock || 0),
      };

      const createdProduct = await createAdminProducto(payload);
      setSuccessMessage(`${createdProduct.nombre} se agregó al catálogo.`);
      setProductForm(initialProductForm);
      setCreateColorVariants([createEmptyColorVariantForm(1)]);
      setActiveCreateColorIndex(0);
      onProductCreated?.(createdProduct);
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo crear el producto.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleEditClick = (product) => {
    const imageUrls = parseJsonArray(product.image_urls);
    const colorVariants = parseJsonArray(product.color_variants_json);
    const normalizedColorVariants = normalizeVariantForms(
      colorVariants,
      [...new Set([product.imagen_url, ...imageUrls].filter(Boolean))],
      product.tono
    );
    setEditingProduct(product);
    setEditForm({
      nombre: product.nombre || '',
      descripcion: product.descripcion || '',
      precio: String(normalizePrice(product.precio) || ''),
      imagen_url: product.imagen_url || normalizedColorVariants[0]?.imagen_url || '',
      imagen_url_2: imageUrls[1] || normalizedColorVariants[0]?.imagen_url_2 || '',
      imagen_url_3: imageUrls[2] || normalizedColorVariants[0]?.imagen_url_3 || '',
      color_variants_text: variantsToText(colorVariants),
      stock: String(product.stock || '0'),
      categoria: product.categoria || '',
      tono: product.tono || '',
      material: product.material || '',
      etiqueta: product.etiqueta || '',
    });
    setEditColorVariants(normalizedColorVariants);
    setActiveEditColorIndex(0);
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const applyPruebaPresetToCreate = () => {
    setProductForm((current) => ({
      ...current,
      ...pruebaImgPreset,
    }));
    setCreateColorVariants(pruebaImgColorVariantForms.map((variant) => ({ ...variant })));
    setActiveCreateColorIndex(0);
  };

  const applyPruebaPresetToEdit = () => {
    setEditForm((current) => ({
      ...current,
      ...pruebaImgPreset,
    }));
    setEditColorVariants(pruebaImgColorVariantForms.map((variant) => ({ ...variant })));
    setActiveEditColorIndex(0);
  };

  const addCreateColorVariant = () => {
    setCreateColorVariants((current) => {
      const next = [...current, createEmptyColorVariantForm(current.length + 1)];
      setActiveCreateColorIndex(next.length - 1);
      return next;
    });
  };

  const removeCreateColorVariant = (index) => {
    setCreateColorVariants((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, variantIndex) => variantIndex !== index);
      setActiveCreateColorIndex((prev) => Math.max(0, Math.min(prev, next.length - 1)));
      return next;
    });
  };

  const updateCreateColorVariantField = (index, field, value) => {
    setCreateColorVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, [field]: value } : variant
    )));
  };

  const addEditColorVariant = () => {
    setEditColorVariants((current) => {
      const next = [...current, createEmptyColorVariantForm(current.length + 1)];
      setActiveEditColorIndex(next.length - 1);
      return next;
    });
  };

  const removeEditColorVariant = (index) => {
    setEditColorVariants((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, variantIndex) => variantIndex !== index);
      setActiveEditColorIndex((prev) => Math.max(0, Math.min(prev, next.length - 1)));
      return next;
    });
  };

  const updateEditColorVariantField = (index, field, value) => {
    setEditColorVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, [field]: value } : variant
    )));
  };

  const handleCreateImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingCreateImage(true);
    setActionError('');
    try {
      const { url } = await uploadProductImage(file);
      const targetField = imageFieldByIndex(pendingCreateImageSlot);
      updateCreateColorVariantField(activeCreateColorIndex, targetField, url);
    } catch (error) {
      setActionError(error.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingCreateImage(false);
      event.target.value = '';
    }
  };

  const handleEditImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingEditImage(true);
    setActionError('');
    try {
      const { url } = await uploadProductImage(file);
      const targetField = imageFieldByIndex(pendingEditImageSlot);
      updateEditColorVariantField(activeEditColorIndex, targetField, url);
    } catch (error) {
      setActionError(error.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingEditImage(false);
      event.target.value = '';
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setIsSavingEdit(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const mediaPayload = buildProductMediaPayload(editColorVariants, editForm.tono);
      const payload = {
        ...editForm,
        tono: mediaPayload.tono,
        imagen_url: mediaPayload.imagen_url,
        image_urls: mediaPayload.image_urls,
        color_variants: mediaPayload.color_variants,
        precio: Number(editForm.precio),
        stock: Number(editForm.stock || 0),
      };

      const updated = await updateAdminProducto(editingProduct.id, payload);
      setSuccessMessage(`${updated.nombre} se actualizó correctamente.`);
      setEditingProduct(null);
      setEditColorVariants([createEmptyColorVariantForm(1)]);
      setActiveEditColorIndex(0);
      onProductCreated?.(updated);
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

  const handleCreateAnnouncementImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setActionError('');
    try {
      const { url } = await uploadProductImage(file);
      setAnnouncementForm((current) => ({ ...current, imagen_url: url }));
    } catch (error) {
      setActionError(error.message || 'No se pudo subir la imagen del anuncio.');
    }
  };

  const handleEditAnnouncementImageFile = async (announcementId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setActionError('');
    try {
      const { url } = await uploadProductImage(file);
      setAnnouncementDrafts((current) => ({
        ...current,
        [announcementId]: {
          ...(current[announcementId] || {}),
          imagen_url: url,
          estado: current[announcementId]?.estado || 'activo',
        },
      }));
    } catch (error) {
      setActionError(error.message || 'No se pudo subir la imagen del anuncio.');
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

  const handleCreateDiscountRule = async () => {
    setActionError('');
    try {
      const created = await createAdminDiscountRule({
        ...discountForm,
        min_order_value: Number(discountForm.min_order_value || 0),
        min_quantity: Number(discountForm.min_quantity || 0),
        discount_percent: Number(discountForm.discount_percent || 0),
        max_uses_per_user: discountForm.max_uses_per_user ? Number(discountForm.max_uses_per_user) : null,
        prioridad: Number(discountForm.prioridad || 100),
      });
      setDiscountRules((prev) => [...prev, created]);
      setSuccessMessage('Descuento creado correctamente.');
      setDiscountForm({
        nombre: '',
        tipo: 'quantity',
        min_order_value: '0',
        min_quantity: '2',
        discount_percent: '10',
        max_uses_per_user: '',
        activo: true,
        prioridad: '100',
      });
    } catch (error) {
      setActionError(error.message || 'No se pudo crear la regla de descuento.');
    }
  };

  const handleSaveDiscountRule = async (rule) => {
    setSavingDiscountId(rule.id);
    setActionError('');
    try {
      const updated = await updateAdminDiscountRule(rule.id, {
        ...rule,
        min_order_value: Number(rule.min_order_value || 0),
        min_quantity: Number(rule.min_quantity || 0),
        discount_percent: Number(rule.discount_percent || 0),
        max_uses_per_user: rule.max_uses_per_user ? Number(rule.max_uses_per_user) : null,
        prioridad: Number(rule.prioridad || 100),
        activo: rule.activo,
      });
      setDiscountRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage(`Descuento #${rule.id} actualizado.`);
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar el descuento.');
    } finally {
      setSavingDiscountId(null);
    }
  };

  const handleDownloadOfflineTemplate = async () => {
    setActionError('');
    setSuccessMessage('');
    setIsDownloadingTemplate(true);

    try {
      const blob = await downloadOfflineSalesTemplate();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'plantilla_ventas_externas_azami.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setSuccessMessage('La plantilla de ventas externas se descargó correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo descargar la plantilla de ventas externas.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportOfflineSales = async (event) => {
    event.preventDefault();

    if (!offlineSalesFile) {
      setActionError('Selecciona un archivo Excel o CSV antes de importar las ventas externas.');
      return;
    }

    setActionError('');
    setSuccessMessage('');
    setIsImportingOfflineSales(true);

    try {
      const formData = new FormData();
      formData.append('file', offlineSalesFile);

      const result = await importOfflineSalesWorkbook(formData);
      setSuccessMessage(result.message || 'Las ventas externas se importaron correctamente.');
      setOfflineSalesFile(null);
      if (offlineSalesInputRef.current) {
        offlineSalesInputRef.current.value = '';
      }
      await loadDashboard();
    } catch (error) {
      setActionError(error.message || 'No se pudo importar el archivo de ventas externas.');
    } finally {
      setIsImportingOfflineSales(false);
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

  // ── CMS handlers ────────────────────────────────────────────────────────────
  const handleAddFilter = async () => {
    if (!cmsNewFilter.valor.trim()) return;
    try {
      const added = await addAdminCmsFilter(cmsNewFilter);
      setCmsFilters((prev) => {
        const key = cmsNewFilter.tipo === 'categoria' ? 'categorias' : 'tonos';
        return { ...prev, [key]: [...(prev[key] || []), added] };
      });
      setCmsNewFilter((f) => ({ ...f, valor: '' }));
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
  };

  const handleDeleteFilter = async (id, tipo) => {
    try {
      await deleteAdminCmsFilter(id);
      setCmsFilters((prev) => {
        const key = tipo === 'categoria' ? 'categorias' : 'tonos';
        return { ...prev, [key]: prev[key].filter((f) => f.id !== id) };
      });
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
  };

  const handleSaveContent = async () => {
    setCmsSaving(true);
    try {
      const items = Object.entries(cmsContentEdits).map(([key, valor]) => {
        const [seccion, ...rest] = key.split('.');
        return { seccion, clave: rest.join('.'), valor };
      });
      await saveAdminCmsContent(items);
      setSuccessMessage('Textos guardados correctamente.');
      setCmsFilters(null); // force reload
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
    finally { setCmsSaving(false); }
  };

  const handleAddSlide = async () => {
    if (!cmsNewSlide.titulo || !cmsNewSlide.imagen_url) {
      setActionError('El título y la URL de imagen son obligatorios.');
      return;
    }
    try {
      const added = await addAdminCmsSlide(cmsNewSlide);
      setCmsCarousel((prev) => [...(prev || []), added]);
      setCmsNewSlide({ eyebrow: '', titulo: '', descripcion: '', imagen_url: '', orden: (cmsCarousel?.length || 0) });
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
  };

  const handleSaveSlide = async () => {
    if (!cmsEditSlide) return;
    try {
      await updateAdminCmsSlide(cmsEditSlide.id, cmsEditSlide);
      setCmsCarousel((prev) => prev.map((s) => (s.id === cmsEditSlide.id ? { ...s, ...cmsEditSlide } : s)));
      setCmsEditSlide(null);
      setSuccessMessage('Slide guardado.');
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
  };

  const handleDeleteSlide = async (id) => {
    try {
      await deleteAdminCmsSlide(id);
      setCmsCarousel((prev) => prev.filter((s) => s.id !== id));
      notifyCmsUpdated();
    } catch (err) { setActionError(err.message); }
  };

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
              <>
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">Ventas externas</p>
                    <h2>Plantilla e importacion al mismo reporte</h2>
                  </div>
                </div>

                <div className="admin-upload-grid">
                  <div className="admin-upload-copy">
                    <p>
                      Descarga la plantilla oficial para vendedores o para el equipo admin. La importacion crea
                      ordenes en la misma tabla del reporte y descuenta inventario del catalogo actual.
                    </p>
                    <ul className="admin-upload-list">
                      <li>Usa <strong>producto_id</strong> existentes de la base de datos.</li>
                      <li>Repite <strong>referencia_pago</strong> si una venta tiene varios productos.</li>
                      <li>Si dejas precio, subtotal o total vacios, el sistema los calcula automaticamente.</li>
                      <li>El canal, vendedor y notas quedan visibles en el historial admin.</li>
                    </ul>
                  </div>

                  <form className="admin-upload-form" onSubmit={handleImportOfflineSales}>
                    <label className="admin-field admin-field-wide">
                      <span>Archivo de ventas externas</span>
                      <input
                        ref={offlineSalesInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) => setOfflineSalesFile(event.target.files?.[0] || null)}
                      />
                    </label>

                    <p className="admin-upload-hint">
                      {offlineSalesFile
                        ? `Archivo seleccionado: ${offlineSalesFile.name}`
                        : 'Formatos permitidos: .xlsx, .xls o .csv. Tamano maximo: 5 MB.'}
                    </p>

                    <div className="admin-upload-actions">
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={handleDownloadOfflineTemplate}
                        disabled={isDownloadingTemplate}
                      >
                        {isDownloadingTemplate ? 'Descargando...' : 'Descargar plantilla'}
                      </button>
                      <button
                        type="submit"
                        className="admin-primary-button"
                        disabled={isImportingOfflineSales}
                      >
                        {isImportingOfflineSales ? 'Importando ventas...' : 'Importar ventas'}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

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
                  <option value="cancelado">Pago cancelado</option>
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
                          <th>Canal</th>
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
                            <td data-label="Cliente">
                              <strong>{order.cliente}</strong>
                              <small>{order.vendedor_nombre ? `Vendedor: ${order.vendedor_nombre}` : formatLabel(order.origen_registro, 'Plataforma')}</small>
                            </td>
                            <td data-label="Email"><small>{order.cliente_email || '—'}</small></td>
                            <td data-label="Canal">
                              <strong>{formatLabel(order.canal_venta, 'Web')}</strong>
                              <small>{formatLabel(order.origen_registro, 'Plataforma')}</small>
                            </td>
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
            </>
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
                  <div className="admin-inline-actions" style={{ marginBottom: '0.75rem' }}>
                    <button type="button" className="admin-secondary-button" onClick={applyPruebaPresetToCreate}>
                      Cargar demo PRUEBA IMG
                    </button>
                  </div>
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

                    <div className="admin-field admin-field-wide">
                      <span>Colores e imágenes del producto</span>
                      <div className="admin-inline-actions" style={{ marginBottom: '0.65rem', gap: '0.55rem', flexWrap: 'wrap' }}>
                        {createColorVariants.map((variant, index) => (
                          <button
                            key={`create-color-${index}`}
                            type="button"
                            className="admin-secondary-button"
                            style={{
                              borderColor: activeCreateColorIndex === index ? 'var(--color-primary)' : undefined,
                              color: activeCreateColorIndex === index ? 'var(--color-primary)' : undefined,
                            }}
                            onClick={() => setActiveCreateColorIndex(index)}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: '0.7rem',
                                height: '0.7rem',
                                borderRadius: '9999px',
                                marginRight: '0.45rem',
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                                background: isValidHexColor(variant.hex) ? variant.hex : 'var(--color-surface-alt)',
                              }}
                            />
                            {variant.nombre || `Color ${index + 1}`}
                          </button>
                        ))}
                        <button type="button" className="admin-secondary-button" onClick={addCreateColorVariant}>+ Añadir color</button>
                        {createColorVariants.length > 1 && (
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => removeCreateColorVariant(activeCreateColorIndex)}
                          >
                            Eliminar color activo
                          </button>
                        )}
                      </div>

                      <div className="admin-form-grid" style={{ marginTop: '0.2rem' }}>
                        <label className="admin-field">
                          <span>Nombre del color</span>
                          <input
                            type="text"
                            value={createColorVariants[activeCreateColorIndex]?.nombre || ''}
                            onChange={(event) => updateCreateColorVariantField(activeCreateColorIndex, 'nombre', event.target.value)}
                            placeholder="Ej: Negro"
                          />
                        </label>
                        <label className="admin-field">
                          <span>HEX (opcional)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: '1.1rem',
                                height: '1.1rem',
                                borderRadius: '9999px',
                                border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                                background: isValidHexColor(createColorVariants[activeCreateColorIndex]?.hex)
                                  ? createColorVariants[activeCreateColorIndex]?.hex
                                  : 'var(--color-surface-alt)',
                                flex: '0 0 auto',
                              }}
                            />
                          <input
                            type="text"
                            value={createColorVariants[activeCreateColorIndex]?.hex || ''}
                            onChange={(event) => updateCreateColorVariantField(activeCreateColorIndex, 'hex', event.target.value)}
                            placeholder="#121212"
                          />
                          </div>
                        </label>
                      </div>

                      {(createColorVariants[activeCreateColorIndex]?.imagen_url
                        || createColorVariants[activeCreateColorIndex]?.imagen_url_2
                        || createColorVariants[activeCreateColorIndex]?.imagen_url_3) && (
                        <div className="admin-image-uploader" style={{ marginTop: '0.7rem' }}>
                          <img
                            src={createColorVariants[activeCreateColorIndex]?.imagen_url || createColorVariants[activeCreateColorIndex]?.imagen_url_2 || createColorVariants[activeCreateColorIndex]?.imagen_url_3}
                            alt="Vista previa del color activo"
                            className="admin-image-preview"
                          />
                        </div>
                      )}

                      <input
                        ref={createImageInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCreateImageFile}
                      />

                      <div className="admin-image-uploader-controls" style={{ marginTop: '0.65rem' }}>
                        {[0, 1, 2].map((imageIndex) => {
                          const field = imageFieldByIndex(imageIndex);
                          return (
                            <div key={`create-image-slot-${imageIndex}`} className="admin-form-grid" style={{ marginBottom: '0.35rem' }}>
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() => {
                                  setPendingCreateImageSlot(imageIndex);
                                  createImageInputRef.current?.click();
                                }}
                                disabled={isUploadingCreateImage}
                              >
                                {isUploadingCreateImage && pendingCreateImageSlot === imageIndex ? 'Subiendo...' : `Subir imagen ${imageIndex + 1}`}
                              </button>
                              <input
                                type="url"
                                value={createColorVariants[activeCreateColorIndex]?.[field] || ''}
                                onChange={(event) => updateCreateColorVariantField(activeCreateColorIndex, field, event.target.value)}
                                placeholder={`URL imagen ${imageIndex + 1} del color activo`}
                                className="admin-image-url-input"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <small>
                        Si agregas 2 colores, verás 2 botones. Si agregas 3 colores, verás 3 botones. Cada color puede tener hasta 3 imágenes.
                      </small>
                    </div>
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
                        <div className="admin-image-uploader-controls" style={{ marginBottom: '0.55rem' }}>
                          <input
                            ref={createAnnouncementImageInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleCreateAnnouncementImageFile}
                          />
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => createAnnouncementImageInputRef.current?.click()}
                          >
                            Subir imagen
                          </button>
                        </div>
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
                              <div className="admin-image-uploader-controls" style={{ marginBottom: '0.55rem' }}>
                                <input
                                  ref={(element) => { editAnnouncementImageInputRefs.current[item.id] = element; }}
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(event) => handleEditAnnouncementImageFile(item.id, event)}
                                />
                                <button
                                  type="button"
                                  className="admin-secondary-button"
                                  onClick={() => editAnnouncementImageInputRefs.current[item.id]?.click()}
                                >
                                  Subir imagen
                                </button>
                              </div>
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

                  <div className="admin-order-detail-grid">
                    <div className="admin-order-detail-card">
                      <span>Referencia</span>
                      <strong>{orderDetail.referencia_pago || '—'}</strong>
                    </div>
                    <div className="admin-order-detail-card">
                      <span>Canal</span>
                      <strong>{formatLabel(orderDetail.canal_venta, 'Web')}</strong>
                      <small>{formatLabel(orderDetail.origen_registro, 'Plataforma')}</small>
                    </div>
                    <div className="admin-order-detail-card">
                      <span>Pago</span>
                      <strong>{formatLabel(orderDetail.payment_method, 'Manual')}</strong>
                      <small>{formatLabel(orderDetail.payment_status, 'Sin dato')}</small>
                    </div>
                    <div className="admin-order-detail-card">
                      <span>Proveedor</span>
                      <strong>{formatLabel(orderDetail.payment_provider, 'Sin dato')}</strong>
                    </div>
                    {(orderDetail.vendedor_nombre || orderDetail.vendedor_email) && (
                      <div className="admin-order-detail-card">
                        <span>Vendedor</span>
                        <strong>{orderDetail.vendedor_nombre || 'Sin nombre'}</strong>
                        <small>{orderDetail.vendedor_email || 'Sin correo'}</small>
                      </div>
                    )}
                    {orderDetail.notas_admin && (
                      <div className="admin-order-detail-card admin-order-note">
                        <span>Notas internas</span>
                        <p>{orderDetail.notas_admin}</p>
                      </div>
                    )}
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
                <div className="admin-inline-actions" style={{ marginBottom: '0.75rem' }}>
                  <button type="button" className="admin-secondary-button" onClick={applyPruebaPresetToEdit}>
                    Aplicar demo PRUEBA IMG
                  </button>
                </div>
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
                  <div className="admin-field admin-field-wide">
                    <span>Colores e imágenes del producto</span>
                    <div className="admin-inline-actions" style={{ marginBottom: '0.65rem', gap: '0.55rem', flexWrap: 'wrap' }}>
                      {editColorVariants.map((variant, index) => (
                        <button
                          key={`edit-color-${index}`}
                          type="button"
                          className="admin-secondary-button"
                          style={{
                            borderColor: activeEditColorIndex === index ? 'var(--color-primary)' : undefined,
                            color: activeEditColorIndex === index ? 'var(--color-primary)' : undefined,
                          }}
                          onClick={() => setActiveEditColorIndex(index)}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: '0.7rem',
                              height: '0.7rem',
                              borderRadius: '9999px',
                              marginRight: '0.45rem',
                              display: 'inline-block',
                              verticalAlign: 'middle',
                              border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                              background: isValidHexColor(variant.hex) ? variant.hex : 'var(--color-surface-alt)',
                            }}
                          />
                          {variant.nombre || `Color ${index + 1}`}
                        </button>
                      ))}
                      <button type="button" className="admin-secondary-button" onClick={addEditColorVariant}>+ Añadir color</button>
                      {editColorVariants.length > 1 && (
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => removeEditColorVariant(activeEditColorIndex)}
                        >
                          Eliminar color activo
                        </button>
                      )}
                    </div>

                    <div className="admin-form-grid" style={{ marginTop: '0.2rem' }}>
                      <label className="admin-field">
                        <span>Nombre del color</span>
                        <input
                          type="text"
                          value={editColorVariants[activeEditColorIndex]?.nombre || ''}
                          onChange={(event) => updateEditColorVariantField(activeEditColorIndex, 'nombre', event.target.value)}
                          placeholder="Ej: Negro"
                        />
                      </label>
                      <label className="admin-field">
                        <span>HEX (opcional)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: '1.1rem',
                              height: '1.1rem',
                              borderRadius: '9999px',
                              border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                              background: isValidHexColor(editColorVariants[activeEditColorIndex]?.hex)
                                ? editColorVariants[activeEditColorIndex]?.hex
                                : 'var(--color-surface-alt)',
                              flex: '0 0 auto',
                            }}
                          />
                        <input
                          type="text"
                          value={editColorVariants[activeEditColorIndex]?.hex || ''}
                          onChange={(event) => updateEditColorVariantField(activeEditColorIndex, 'hex', event.target.value)}
                          placeholder="#121212"
                        />
                        </div>
                      </label>
                    </div>

                    {(editColorVariants[activeEditColorIndex]?.imagen_url
                      || editColorVariants[activeEditColorIndex]?.imagen_url_2
                      || editColorVariants[activeEditColorIndex]?.imagen_url_3) && (
                      <div className="admin-image-uploader" style={{ marginTop: '0.7rem' }}>
                        <img
                          src={editColorVariants[activeEditColorIndex]?.imagen_url || editColorVariants[activeEditColorIndex]?.imagen_url_2 || editColorVariants[activeEditColorIndex]?.imagen_url_3}
                          alt="Vista previa del color activo"
                          className="admin-image-preview"
                        />
                      </div>
                    )}

                    <input
                      ref={editImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditImageFile}
                    />

                    <div className="admin-image-uploader-controls" style={{ marginTop: '0.65rem' }}>
                      {[0, 1, 2].map((imageIndex) => {
                        const field = imageFieldByIndex(imageIndex);
                        return (
                          <div key={`edit-image-slot-${imageIndex}`} className="admin-form-grid" style={{ marginBottom: '0.35rem' }}>
                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => {
                                setPendingEditImageSlot(imageIndex);
                                editImageInputRef.current?.click();
                              }}
                              disabled={isUploadingEditImage}
                            >
                              {isUploadingEditImage && pendingEditImageSlot === imageIndex ? 'Subiendo...' : `Subir imagen ${imageIndex + 1}`}
                            </button>
                            <input
                              type="url"
                              value={editColorVariants[activeEditColorIndex]?.[field] || ''}
                              onChange={(event) => updateEditColorVariantField(activeEditColorIndex, field, event.target.value)}
                              placeholder={`URL imagen ${imageIndex + 1} del color activo`}
                              className="admin-image-url-input"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <small>
                      El color activo controla su propio grupo de 3 imágenes para el carrusel.
                    </small>
                  </div>
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

            {/* ── CONTENIDO ─────────────────────────────────────────────────── */}
            {activeTab === 'contenido' && (
              <div className="admin-section">
                <h2 className="admin-section-title">Gestión de contenido</h2>

                {cmsLoading && <p className="admin-notice">Cargando contenido...</p>}

                {!cmsLoading && cmsFilters && (
                  <>
                    {/* ── Filtros del catálogo ── */}
                    <div className="admin-cms-block">
                      <h3 className="admin-cms-subtitle">Filtros del catálogo</h3>

                      <div className="admin-cms-filters-grid">
                        {/* Categorías */}
                        <div>
                          <p className="admin-cms-label">Tipos de bolso (categorías)</p>
                          <div className="admin-cms-chips">
                            {(cmsFilters.categorias || []).map((f) => (
                              <span key={f.id} className="admin-cms-chip">
                                {f.valor}
                                <button type="button" onClick={() => handleDeleteFilter(f.id, 'categoria')} aria-label="Eliminar">✕</button>
                              </span>
                            ))}
                          </div>
                          <div className="admin-cms-add-row">
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Nuevo tipo, ej: Clutch"
                              value={cmsNewFilter.tipo === 'categoria' ? cmsNewFilter.valor : ''}
                              onChange={(e) => setCmsNewFilter({ tipo: 'categoria', valor: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                            />
                            <button type="button" className="btn-primary text-sm px-4 py-2 rounded-full" onClick={() => { setCmsNewFilter({ tipo: 'categoria', valor: cmsNewFilter.tipo === 'categoria' ? cmsNewFilter.valor : '' }); handleAddFilter(); }}>
                              + Añadir
                            </button>
                          </div>
                        </div>

                        {/* Tonos */}
                        <div>
                          <p className="admin-cms-label">Colores / tonos</p>
                          <div className="admin-cms-chips">
                            {(cmsFilters.tonos || []).map((f) => (
                              <span key={f.id} className="admin-cms-chip">
                                {f.valor}
                                <button type="button" onClick={() => handleDeleteFilter(f.id, 'tono')} aria-label="Eliminar">✕</button>
                              </span>
                            ))}
                          </div>
                          <div className="admin-cms-add-row">
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Nuevo tono, ej: Lila"
                              value={cmsNewFilter.tipo === 'tono' ? cmsNewFilter.valor : ''}
                              onChange={(e) => setCmsNewFilter({ tipo: 'tono', valor: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                            />
                            <button type="button" className="btn-primary text-sm px-4 py-2 rounded-full" onClick={() => { setCmsNewFilter({ tipo: 'tono', valor: cmsNewFilter.tipo === 'tono' ? cmsNewFilter.valor : '' }); handleAddFilter(); }}>
                              + Añadir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Textos del sitio ── */}
                    <div className="admin-cms-block">
                      <h3 className="admin-cms-subtitle">Textos informativos</h3>
                      <div className="admin-cms-content-grid">
                        {Object.entries(cmsContentEdits).map(([key, val]) => (
                          <label key={key} className="admin-field">
                            <span className="admin-cms-content-key">{key.replace('.', ' → ')}</span>
                            <small className="text-muted" style={{ marginTop: '-0.2rem' }}>
                              {CMS_CONTENT_HELP[key] || 'Campo de contenido configurable desde el CMS.'}
                            </small>
                            <textarea
                              className="admin-input"
                              rows={val.length > 80 ? 3 : 1}
                              value={val}
                              onChange={(e) => setCmsContentEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn-primary text-sm px-5 py-2.5 rounded-full mt-4"
                        onClick={handleSaveContent}
                        disabled={cmsSaving}
                      >
                        {cmsSaving ? 'Guardando...' : 'Guardar textos'}
                      </button>
                    </div>

                    {/* ── Carrusel principal ── */}
                    <div className="admin-cms-block">
                      <h3 className="admin-cms-subtitle">Carrusel principal (hero)</h3>

                      {(cmsCarousel || []).map((slide) => (
                        <div key={slide.id} className="admin-cms-slide-row">
                          <img src={slide.imagen_url} alt={slide.titulo} className="admin-cms-slide-thumb" loading="lazy" referrerPolicy="no-referrer" />
                          <div className="admin-cms-slide-info">
                            {cmsEditSlide?.id === slide.id ? (
                              <div className="admin-cms-slide-edit">
                                <input className="admin-input" placeholder="Eyebrow" value={cmsEditSlide.eyebrow} onChange={(e) => setCmsEditSlide((s) => ({ ...s, eyebrow: e.target.value }))} />
                                <input className="admin-input" placeholder="Título" value={cmsEditSlide.titulo} onChange={(e) => setCmsEditSlide((s) => ({ ...s, titulo: e.target.value }))} />
                                <textarea className="admin-input" rows={2} placeholder="Descripción" value={cmsEditSlide.descripcion} onChange={(e) => setCmsEditSlide((s) => ({ ...s, descripcion: e.target.value }))} />
                                <input className="admin-input" placeholder="URL imagen" value={cmsEditSlide.imagen_url} onChange={(e) => setCmsEditSlide((s) => ({ ...s, imagen_url: e.target.value }))} />
                                <input className="admin-input" type="number" placeholder="Orden" value={cmsEditSlide.orden} onChange={(e) => setCmsEditSlide((s) => ({ ...s, orden: Number(e.target.value) }))} />
                                <div className="admin-cms-slide-btns">
                                  <button type="button" className="btn-primary text-sm px-4 py-1.5 rounded-full" onClick={handleSaveSlide}>Guardar</button>
                                  <button type="button" className="btn-secondary text-sm px-4 py-1.5 rounded-full" onClick={() => setCmsEditSlide(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <strong className="text-heading text-sm">{slide.titulo}</strong>
                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{slide.eyebrow}</p>
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{slide.imagen_url}</p>
                                <div className="admin-cms-slide-btns">
                                  <button type="button" className="btn-secondary text-sm px-4 py-1.5 rounded-full" onClick={() => setCmsEditSlide({ ...slide })}>Editar</button>
                                  <button type="button" className="btn-danger text-sm px-4 py-1.5 rounded-full" onClick={() => handleDeleteSlide(slide.id)}>Eliminar</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="admin-cms-block" style={{ marginTop: '1.5rem' }}>
                        <p className="admin-cms-label">Añadir nuevo slide</p>
                        <div className="admin-cms-slide-edit">
                          <input className="admin-input" placeholder="Eyebrow (ej: Editorial)" value={cmsNewSlide.eyebrow} onChange={(e) => setCmsNewSlide((s) => ({ ...s, eyebrow: e.target.value }))} />
                          <input className="admin-input" placeholder="Título*" value={cmsNewSlide.titulo} onChange={(e) => setCmsNewSlide((s) => ({ ...s, titulo: e.target.value }))} />
                          <textarea className="admin-input" rows={2} placeholder="Descripción" value={cmsNewSlide.descripcion} onChange={(e) => setCmsNewSlide((s) => ({ ...s, descripcion: e.target.value }))} />
                          <input className="admin-input" placeholder="URL de imagen*" value={cmsNewSlide.imagen_url} onChange={(e) => setCmsNewSlide((s) => ({ ...s, imagen_url: e.target.value }))} />
                          <button type="button" className="btn-primary text-sm px-5 py-2.5 rounded-full" onClick={handleAddSlide}>+ Añadir slide</button>
                        </div>
                      </div>
                    </div>

                    <div className="admin-cms-block">
                      <h3 className="admin-cms-subtitle">Descuentos automáticos</h3>
                      <p className="admin-cms-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                        Crea reglas por usuario nuevo o por cantidad de pedido. Puedes encender/apagar cada regla cuando quieras.
                      </p>

                      <div className="admin-cms-slide-edit">
                        <input className="admin-input" placeholder="Nombre del descuento" value={discountForm.nombre} onChange={(e) => setDiscountForm((prev) => ({ ...prev, nombre: e.target.value }))} />
                        <select className="admin-input" value={discountForm.tipo} onChange={(e) => setDiscountForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                          <option value="new_user">Nuevo usuario (uso único)</option>
                          <option value="quantity">Por cantidad de pedido</option>
                        </select>
                        <input className="admin-input" type="number" min="0" placeholder="Monto mínimo del pedido" value={discountForm.min_order_value} onChange={(e) => setDiscountForm((prev) => ({ ...prev, min_order_value: e.target.value }))} />
                        <input className="admin-input" type="number" min="0" placeholder="Cantidad mínima de productos" value={discountForm.min_quantity} onChange={(e) => setDiscountForm((prev) => ({ ...prev, min_quantity: e.target.value }))} />
                        <input className="admin-input" type="number" min="1" max="90" placeholder="% descuento" value={discountForm.discount_percent} onChange={(e) => setDiscountForm((prev) => ({ ...prev, discount_percent: e.target.value }))} />
                        <input className="admin-input" type="number" min="1" placeholder="Máx. usos por usuario (vacío = sin límite)" value={discountForm.max_uses_per_user} onChange={(e) => setDiscountForm((prev) => ({ ...prev, max_uses_per_user: e.target.value }))} />
                        <label className="admin-field" style={{ marginTop: '-0.2rem' }}>
                          <span>Activo</span>
                          <select className="admin-input" value={discountForm.activo ? 'true' : 'false'} onChange={(e) => setDiscountForm((prev) => ({ ...prev, activo: e.target.value === 'true' }))}>
                            <option value="true">Encendido</option>
                            <option value="false">Apagado</option>
                          </select>
                        </label>
                        <button type="button" className="btn-primary text-sm px-5 py-2.5 rounded-full" onClick={handleCreateDiscountRule}>+ Añadir descuento</button>
                      </div>

                      <div className="admin-cms-content-grid" style={{ marginTop: '0.8rem' }}>
                        {discountRules.map((rule) => (
                          <div key={rule.id} className="admin-cms-slide-row" style={{ gridTemplateColumns: '1fr' }}>
                            <div className="admin-cms-slide-edit">
                              <input className="admin-input" value={rule.nombre} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, nombre: e.target.value } : item)))} />
                              <div className="admin-cms-slide-btns">
                                <select className="admin-input" value={rule.tipo} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, tipo: e.target.value } : item)))}>
                                  <option value="new_user">Nuevo usuario</option>
                                  <option value="quantity">Por cantidad</option>
                                </select>
                                <input className="admin-input" type="number" min="0" value={rule.min_order_value} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, min_order_value: e.target.value } : item)))} />
                                <input className="admin-input" type="number" min="0" value={rule.min_quantity} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, min_quantity: e.target.value } : item)))} />
                                <input className="admin-input" type="number" min="1" max="90" value={rule.discount_percent} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, discount_percent: e.target.value } : item)))} />
                                <select className="admin-input" value={rule.activo ? 'true' : 'false'} onChange={(e) => setDiscountRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, activo: e.target.value === 'true' } : item)))}>
                                  <option value="true">Encendido</option>
                                  <option value="false">Apagado</option>
                                </select>
                              </div>
                              <button type="button" className="btn-secondary text-sm px-4 py-1.5 rounded-full" onClick={() => handleSaveDiscountRule(rule)} disabled={savingDiscountId === rule.id}>
                                {savingDiscountId === rule.id ? 'Guardando...' : 'Guardar regla'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
      </section>
    </main>
  );
}

export default AdminDashboardPage;
