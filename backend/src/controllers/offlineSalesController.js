import XLSX from 'xlsx';
import pool from '../db.js';
import { logActividad } from '../userSchema.js';
import {
  buildOfflineSalesTemplateBuffer,
  OFFLINE_SALES_TEMPLATE_FILENAME,
  OFFLINE_SALES_TEMPLATE_SHEET,
} from '../services/offlineSalesTemplate.js';

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '_');
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeSlug(value, fallback) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function parseInteger(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseAmount(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSaleDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return new Date();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isEmptyRow(row) {
  return Object.values(row).every((value) => normalizeText(value) === '');
}

const paymentStatusAliases = new Map([
  ['approved', 'approved'],
  ['aprobado', 'approved'],
  ['pagado', 'approved'],
  ['paid', 'approved'],
  ['pending', 'pending'],
  ['pendiente', 'pending'],
  ['rejected', 'rejected'],
  ['rechazado', 'rejected'],
  ['declined', 'rejected'],
  ['fallido', 'rejected'],
]);

const orderStateAliases = new Map([
  ['pendiente', 'pendiente'],
  ['pending', 'pendiente'],
  ['confirmado', 'confirmado'],
  ['pagado', 'confirmado'],
  ['approved', 'confirmado'],
  ['enviado', 'enviado'],
  ['entregado', 'entregado'],
  ['cancelado', 'cancelado'],
  ['cancelled', 'cancelado'],
  ['rechazado', 'cancelado'],
  ['rejected', 'cancelado'],
]);

function resolveOrderState(paymentStatus) {
  if (paymentStatus === 'pending') return 'pendiente';
  if (paymentStatus === 'rejected') return 'cancelado';
  return 'confirmado';
}

function normalizePaymentStatus(value) {
  return paymentStatusAliases.get(normalizeSlug(value, 'approved')) || 'approved';
}

function normalizeOrderState(value, paymentStatus) {
  return orderStateAliases.get(normalizeSlug(value, '')) || resolveOrderState(paymentStatus);
}

function normalizeCurrency(value) {
  return normalizeText(value).toUpperCase().slice(0, 3) || 'COP';
}

function parseWorkbookRows(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
  });

  const targetSheetName = workbook.SheetNames.find(
    (sheetName) => normalizeHeader(sheetName) === OFFLINE_SALES_TEMPLATE_SHEET
  ) || workbook.SheetNames[0];

  if (!targetSheetName) {
    return { headers: [], rows: [] };
  }

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (!matrix.length) {
    return { headers: [], rows: [] };
  }

  const headers = matrix[0].map(normalizeHeader);
  const rows = matrix.slice(1)
    .map((values, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ''])),
    }))
    .filter((row) => !isEmptyRow(row.values));

  return { headers, rows };
}

function buildAddress(values, customerName) {
  const address = {
    alias: normalizeText(values.alias_envio).slice(0, 60) || 'Entrega',
    nombre_receptor: normalizeText(values.nombre_receptor).slice(0, 120) || customerName,
    telefono: normalizeText(values.telefono_envio || values.cliente_telefono).slice(0, 30) || null,
    calle: normalizeText(values.calle).slice(0, 255),
    ciudad: normalizeText(values.ciudad).slice(0, 120),
    estado: normalizeText(values.estado).slice(0, 120),
    codigo_postal: normalizeText(values.codigo_postal).slice(0, 20),
    pais: normalizeText(values.pais).slice(0, 80) || 'Colombia',
  };

  const hasAddressData = Object.values(address).some((value) => value && value !== 'Entrega' && value !== 'Colombia');
  return hasAddressData ? address : null;
}

function requiredHeadersPresent(headers) {
  const requiredHeaders = ['referencia_pago', 'cliente_nombre', 'producto_id', 'cantidad'];
  return requiredHeaders.filter((header) => !headers.includes(header));
}

async function loadProductsById(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const placeholders = productIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT id, nombre, precio, stock, categoria, tono, material
     FROM productos
     WHERE id IN (${placeholders})`,
    productIds
  );

  return new Map(rows.map((row) => [row.id, row]));
}

function buildOrderGroups(rows) {
  const groups = new Map();
  const issues = [];

  for (const row of rows) {
    const values = row.values;
    const reference = normalizeText(values.referencia_pago).slice(0, 80);
    const customerName = normalizeText(values.cliente_nombre).slice(0, 255);
    const productId = parseInteger(values.producto_id);
    const quantity = parseInteger(values.cantidad);
    const saleDate = parseSaleDate(values.fecha_venta);

    if (!reference) {
      issues.push(`Fila ${row.rowNumber}: referencia_pago es obligatorio.`);
      continue;
    }

    if (!customerName) {
      issues.push(`Fila ${row.rowNumber}: cliente_nombre es obligatorio.`);
      continue;
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      issues.push(`Fila ${row.rowNumber}: producto_id debe ser un entero positivo.`);
      continue;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      issues.push(`Fila ${row.rowNumber}: cantidad debe ser un entero positivo.`);
      continue;
    }

    if (!saleDate) {
      issues.push(`Fila ${row.rowNumber}: fecha_venta no tiene un formato valido.`);
      continue;
    }

    const paymentStatus = normalizePaymentStatus(values.payment_status);
    const orderState = normalizeOrderState(values.estado_orden, paymentStatus);
    const shipping = parseAmount(values.envio);
    const subtotalOverride = parseAmount(values.subtotal);
    const totalOverride = parseAmount(values.total);
    const unitPriceOverride = parseAmount(values.precio_unitario);

    if (values.envio !== '' && shipping === null) {
      issues.push(`Fila ${row.rowNumber}: envio debe ser numerico.`);
      continue;
    }

    if (values.subtotal !== '' && subtotalOverride === null) {
      issues.push(`Fila ${row.rowNumber}: subtotal debe ser numerico.`);
      continue;
    }

    if (values.total !== '' && totalOverride === null) {
      issues.push(`Fila ${row.rowNumber}: total debe ser numerico.`);
      continue;
    }

    if (values.precio_unitario !== '' && unitPriceOverride === null) {
      issues.push(`Fila ${row.rowNumber}: precio_unitario debe ser numerico.`);
      continue;
    }

    if (!groups.has(reference)) {
      groups.set(reference, {
        reference,
        rowNumbers: [row.rowNumber],
        saleDate,
        channel: normalizeSlug(values.canal_venta, 'venta_externa'),
        origin: normalizeSlug(values.origen_registro, 'excel_admin'),
        sellerName: normalizeText(values.vendedor_nombre).slice(0, 120) || null,
        sellerEmail: normalizeEmail(values.vendedor_email).slice(0, 255) || null,
        customerName,
        customerEmail: normalizeEmail(values.cliente_email).slice(0, 255) || null,
        customerPhone: normalizeText(values.cliente_telefono).slice(0, 30) || null,
        shippingAddress: buildAddress(values, customerName),
        currency: normalizeCurrency(values.moneda),
        paymentProvider: normalizeText(values.payment_provider).slice(0, 40) || 'venta_externa',
        paymentMethod: normalizeText(values.payment_method).slice(0, 40) || 'manual',
        paymentStatus,
        orderState,
        shipping: shipping ?? 0,
        subtotalOverride,
        totalOverride,
        notes: normalizeText(values.notas_admin) || null,
        items: [],
      });
    } else {
      groups.get(reference).rowNumbers.push(row.rowNumber);
    }

    groups.get(reference).items.push({
      rowNumber: row.rowNumber,
      productId,
      quantity,
      unitPriceOverride,
    });
  }

  return { groups, issues };
}

function validateGroupTotals(groups, productsById) {
  const issues = [];
  const productDemand = new Map();

  for (const group of groups.values()) {
    let computedItemsSubtotal = 0;

    for (const item of group.items) {
      const product = productsById.get(item.productId);
      if (!product) {
        issues.push(`Fila ${item.rowNumber}: el producto ${item.productId} no existe en la base de datos.`);
        continue;
      }

      const unitPrice = item.unitPriceOverride ?? Number(product.precio || 0);
      computedItemsSubtotal += unitPrice * item.quantity;
      productDemand.set(item.productId, (productDemand.get(item.productId) || 0) + item.quantity);
    }

    const subtotal = group.subtotalOverride ?? computedItemsSubtotal;
    const total = group.totalOverride ?? (subtotal + group.shipping);

    if (subtotal < computedItemsSubtotal) {
      issues.push(`Referencia ${group.reference}: subtotal no puede ser menor a la suma de los items.`);
      continue;
    }

    if (total < subtotal + group.shipping) {
      issues.push(`Referencia ${group.reference}: total no puede ser menor a subtotal + envio.`);
    }

    group.subtotal = subtotal;
    group.total = total;
  }

  for (const [productId, demandedQuantity] of productDemand.entries()) {
    const product = productsById.get(productId);
    if (!product) continue;

    if (Number(product.stock || 0) < demandedQuantity) {
      issues.push(`Producto ${product.nombre} (${productId}) no tiene stock suficiente para importar ${demandedQuantity} unidad(es).`);
    }
  }

  return { issues, productDemand };
}

async function existingReferences(references) {
  if (!references.length) {
    return [];
  }

  const placeholders = references.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT referencia_pago
     FROM ordenes
     WHERE referencia_pago IN (${placeholders})`,
    references
  );

  return rows.map((row) => row.referencia_pago);
}

export async function downloadOfflineSalesTemplate(req, res, next) {
  try {
    const [products] = await pool.query(
      `SELECT id, nombre, categoria, tono, material, precio, stock
       FROM productos
       ORDER BY nombre ASC`
    );

    const buffer = buildOfflineSalesTemplateBuffer(products);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${OFFLINE_SALES_TEMPLATE_FILENAME}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function importOfflineSalesWorkbook(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'Adjunta un archivo Excel o CSV para importar las ventas externas.' });
  }

  try {
    const { headers, rows } = parseWorkbookRows(req.file.buffer);

    if (!rows.length) {
      return res.status(400).json({ error: 'La plantilla no contiene filas de ventas para importar.' });
    }

    const missingHeaders = requiredHeadersPresent(headers);
    if (missingHeaders.length > 0) {
      return res.status(400).json({ error: `Faltan columnas obligatorias en la plantilla: ${missingHeaders.join(', ')}.` });
    }

    const { groups, issues: rowIssues } = buildOrderGroups(rows);
    if (rowIssues.length > 0) {
      return res.status(400).json({ error: rowIssues.slice(0, 8).join(' ') });
    }

    const references = [...groups.keys()];
    const duplicateReferences = await existingReferences(references);
    if (duplicateReferences.length > 0) {
      return res.status(409).json({
        error: `Ya existen ventas con estas referencias y no se volveran a importar: ${duplicateReferences.join(', ')}.`,
      });
    }

    const productIds = [...new Set([...groups.values()].flatMap((group) => group.items.map((item) => item.productId)))];
    const productsById = await loadProductsById(productIds);
    const { issues, productDemand } = validateGroupTotals(groups, productsById);

    if (issues.length > 0) {
      return res.status(400).json({ error: issues.slice(0, 8).join(' ') });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      let importedOrders = 0;
      let importedItems = 0;

      for (const group of groups.values()) {
        const [orderResult] = await connection.query(
          `INSERT INTO ordenes
             (usuario_id, cliente_tipo, cliente_nombre, cliente_email, cliente_telefono, subtotal, envio, total, moneda, estado, referencia_pago, payment_provider, payment_method, payment_status, direccion_envio_json, canal_venta, origen_registro, vendedor_nombre, vendedor_email, notas_admin, creado_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            null,
            'external',
            group.customerName,
            group.customerEmail,
            group.customerPhone,
            group.subtotal.toFixed(2),
            group.shipping.toFixed(2),
            group.total.toFixed(2),
            group.currency,
            group.orderState,
            group.reference,
            group.paymentProvider,
            group.paymentMethod,
            group.paymentStatus,
            group.shippingAddress ? JSON.stringify(group.shippingAddress) : null,
            group.channel,
            group.origin,
            group.sellerName,
            group.sellerEmail,
            group.notes,
            group.saleDate,
          ]
        );

        for (const item of group.items) {
          const product = productsById.get(item.productId);
          const unitPrice = item.unitPriceOverride ?? Number(product.precio || 0);

          await connection.query(
            'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
            [orderResult.insertId, item.productId, item.quantity, unitPrice.toFixed(2)]
          );

          importedItems += 1;
        }

        importedOrders += 1;
      }

      for (const [productId, demandedQuantity] of productDemand.entries()) {
        await connection.query(
          'UPDATE productos SET stock = stock - ? WHERE id = ?',
          [demandedQuantity, productId]
        );
      }

      await connection.commit();

      await logActividad({
        usuarioId: req.user?.id || null,
        accion: 'importar_ventas_externas',
        descripcion: `Se importaron ${importedOrders} venta(s) externas desde ${req.file.originalname}`,
        ip: clientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });

      return res.status(201).json({
        importedOrders,
        importedItems,
        message: `Se importaron ${importedOrders} venta(s) externas y ${importedItems} item(s) correctamente.`,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection?.release();
    }
  } catch (error) {
    next(error);
  }
}