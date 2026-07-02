import XLSX from 'xlsx';

export const OFFLINE_SALES_TEMPLATE_FILENAME = 'plantilla_ventas_externas_azami.xlsx';
export const OFFLINE_SALES_TEMPLATE_SHEET = 'ventas_externas';

const TEMPLATE_COLUMNS = [
  {
    key: 'referencia_pago',
    required: 'Si',
    description: 'Referencia unica de la venta. Si una venta tiene varios productos, repite esta referencia en varias filas.',
    example: 'EXT-20260629-001',
  },
  {
    key: 'fecha_venta',
    required: 'No',
    description: 'Fecha y hora de la venta. Si queda vacia se toma la fecha actual.',
    example: '2026-06-29 14:30',
  },
  {
    key: 'canal_venta',
    required: 'No',
    description: 'Canal donde se cerro la venta externa.',
    example: 'whatsapp',
  },
  {
    key: 'origen_registro',
    required: 'No',
    description: 'Origen de la carga para trazabilidad administrativa.',
    example: 'excel_vendedor',
  },
  {
    key: 'vendedor_nombre',
    required: 'No',
    description: 'Nombre de quien cerro la venta fuera de la plataforma.',
    example: 'Maria Perez',
  },
  {
    key: 'vendedor_email',
    required: 'No',
    description: 'Correo del vendedor responsable.',
    example: 'maria@azami.com',
  },
  {
    key: 'cliente_nombre',
    required: 'Si',
    description: 'Nombre del cliente asociado a la venta.',
    example: 'Laura Gomez',
  },
  {
    key: 'cliente_email',
    required: 'No',
    description: 'Correo del cliente.',
    example: 'laura@correo.com',
  },
  {
    key: 'cliente_telefono',
    required: 'No',
    description: 'Telefono del cliente.',
    example: '3001234567',
  },
  {
    key: 'alias_envio',
    required: 'No',
    description: 'Alias corto de la direccion.',
    example: 'Entrega',
  },
  {
    key: 'nombre_receptor',
    required: 'No',
    description: 'Persona que recibe el pedido.',
    example: 'Laura Gomez',
  },
  {
    key: 'telefono_envio',
    required: 'No',
    description: 'Telefono de contacto para la entrega.',
    example: '3001234567',
  },
  {
    key: 'calle',
    required: 'No',
    description: 'Direccion de envio.',
    example: 'Calle 123 #45-67 Apt 801',
  },
  {
    key: 'ciudad',
    required: 'No',
    description: 'Ciudad de envio.',
    example: 'Bogota',
  },
  {
    key: 'estado',
    required: 'No',
    description: 'Departamento o estado de envio.',
    example: 'Cundinamarca',
  },
  {
    key: 'codigo_postal',
    required: 'No',
    description: 'Codigo postal de envio.',
    example: '110111',
  },
  {
    key: 'pais',
    required: 'No',
    description: 'Pais de envio.',
    example: 'Colombia',
  },
  {
    key: 'producto_id',
    required: 'Si',
    description: 'ID del producto existente en la base de datos.',
    example: '12',
  },
  {
    key: 'cantidad',
    required: 'Si',
    description: 'Cantidad vendida de ese producto.',
    example: '2',
  },
  {
    key: 'precio_unitario',
    required: 'No',
    description: 'Precio unitario cobrado. Si queda vacio se usa el precio actual del producto.',
    example: '185000',
  },
  {
    key: 'subtotal',
    required: 'No',
    description: 'Subtotal de la orden. Si queda vacio se calcula automaticamente.',
    example: '370000',
  },
  {
    key: 'envio',
    required: 'No',
    description: 'Costo de envio de la orden.',
    example: '15000',
  },
  {
    key: 'total',
    required: 'No',
    description: 'Total final de la orden. Si queda vacio se calcula como subtotal + envio.',
    example: '385000',
  },
  {
    key: 'moneda',
    required: 'No',
    description: 'Moneda de la transaccion.',
    example: 'COP',
  },
  {
    key: 'payment_provider',
    required: 'No',
    description: 'Proveedor o fuente del pago.',
    example: 'transferencia_manual',
  },
  {
    key: 'payment_method',
    required: 'No',
    description: 'Metodo de pago usado fuera de la web.',
    example: 'nequi',
  },
  {
    key: 'payment_status',
    required: 'No',
    description: 'Estado del pago. Acepta approved/aprobado/pagado, pending/pendiente o rejected/rechazado.',
    example: 'approved',
  },
  {
    key: 'estado_orden',
    required: 'No',
    description: 'Estado logistico visible en reportes. Si queda vacio se deriva del estado de pago.',
    example: 'confirmado',
  },
  {
    key: 'notas_admin',
    required: 'No',
    description: 'Observaciones internas para esta venta.',
    example: 'Venta cerrada por WhatsApp y pagada por transferencia.',
  },
];

function buildSampleRows(products) {
  const firstProduct = products[0] || {};
  const secondProduct = products[1] || firstProduct;

  return [
    {
      referencia_pago: 'EXT-20260629-001',
      fecha_venta: '2026-06-29 14:30',
      canal_venta: 'whatsapp',
      origen_registro: 'excel_vendedor',
      vendedor_nombre: 'Maria Perez',
      vendedor_email: 'maria@azami.com',
      cliente_nombre: 'Laura Gomez',
      cliente_email: 'laura@correo.com',
      cliente_telefono: '3001234567',
      alias_envio: 'Entrega',
      nombre_receptor: 'Laura Gomez',
      telefono_envio: '3001234567',
      calle: 'Calle 123 #45-67 Apt 801',
      ciudad: 'Bogota',
      estado: 'Cundinamarca',
      codigo_postal: '110111',
      pais: 'Colombia',
      producto_id: firstProduct.id || '',
      cantidad: 1,
      precio_unitario: firstProduct.precio || '',
      subtotal: '',
      envio: 15000,
      total: '',
      moneda: 'COP',
      payment_provider: 'transferencia_manual',
      payment_method: 'nequi',
      payment_status: 'approved',
      estado_orden: 'confirmado',
      notas_admin: 'Venta fuera de la plataforma cerrada por WhatsApp.',
    },
    {
      referencia_pago: 'EXT-20260629-001',
      fecha_venta: '2026-06-29 14:30',
      canal_venta: 'whatsapp',
      origen_registro: 'excel_vendedor',
      vendedor_nombre: 'Maria Perez',
      vendedor_email: 'maria@azami.com',
      cliente_nombre: 'Laura Gomez',
      cliente_email: 'laura@correo.com',
      cliente_telefono: '3001234567',
      alias_envio: 'Entrega',
      nombre_receptor: 'Laura Gomez',
      telefono_envio: '3001234567',
      calle: 'Calle 123 #45-67 Apt 801',
      ciudad: 'Bogota',
      estado: 'Cundinamarca',
      codigo_postal: '110111',
      pais: 'Colombia',
      producto_id: secondProduct.id || '',
      cantidad: 2,
      precio_unitario: secondProduct.precio || '',
      subtotal: '',
      envio: 15000,
      total: '',
      moneda: 'COP',
      payment_provider: 'transferencia_manual',
      payment_method: 'nequi',
      payment_status: 'approved',
      estado_orden: 'confirmado',
      notas_admin: 'Repite la referencia para agregar mas items a la misma venta.',
    },
  ];
}

function buildInstructionRows() {
  return TEMPLATE_COLUMNS.map((column) => ({
    campo: column.key,
    obligatorio: column.required,
    descripcion: column.description,
    ejemplo: column.example,
  }));
}

function buildCatalogRows(products) {
  return (products || []).map((product) => ({
    producto_id: product.id,
    nombre: product.nombre,
    categoria: product.categoria,
    tono: product.tono,
    material: product.material,
    precio_actual_cop: product.precio,
    stock_disponible: product.stock,
  }));
}

export function buildOfflineSalesTemplateWorkbook(products = []) {
  const workbook = XLSX.utils.book_new();
  const salesSheet = XLSX.utils.json_to_sheet(buildSampleRows(products), {
    header: TEMPLATE_COLUMNS.map((column) => column.key),
  });
  const instructionsSheet = XLSX.utils.json_to_sheet(buildInstructionRows());
  const catalogSheet = XLSX.utils.json_to_sheet(buildCatalogRows(products));

  XLSX.utils.book_append_sheet(workbook, salesSheet, OFFLINE_SALES_TEMPLATE_SHEET);
  XLSX.utils.book_append_sheet(workbook, catalogSheet, 'catalogo_referencia');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'instrucciones');

  return workbook;
}

export function buildOfflineSalesTemplateBuffer(products = []) {
  const workbook = buildOfflineSalesTemplateWorkbook(products);
  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
  });
}