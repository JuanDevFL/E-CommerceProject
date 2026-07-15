import pool from '../db.js';

const ALLOWED_TYPES = new Set(['new_user', 'quantity']);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercentage(value) {
  return Math.min(90, Math.max(0, toNumber(value, 0)));
}

function normalizeOptionalInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function sanitizeDiscountPayload(rawPayload = {}) {
  const tipo = String(rawPayload.tipo || '').trim();
  if (!ALLOWED_TYPES.has(tipo)) {
    throw new Error('El tipo de descuento debe ser new_user o quantity.');
  }

  const nombre = String(rawPayload.nombre || '').trim();
  if (!nombre) {
    throw new Error('El nombre del descuento es obligatorio.');
  }

  const discountPercent = clampPercentage(rawPayload.discount_percent);
  if (discountPercent <= 0) {
    throw new Error('El porcentaje de descuento debe ser mayor a 0.');
  }

  const minOrderValue = Math.max(0, toNumber(rawPayload.min_order_value, 0));
  const minQuantity = Math.max(0, Math.floor(toNumber(rawPayload.min_quantity, 0)));
  const maxUsesPerUser = normalizeOptionalInteger(rawPayload.max_uses_per_user);
  const prioridad = Math.max(0, Math.floor(toNumber(rawPayload.prioridad, 100)));
  const activo = rawPayload.activo !== false && rawPayload.activo !== 'false';

  return {
    nombre,
    tipo,
    min_order_value: minOrderValue,
    min_quantity: minQuantity,
    discount_percent: discountPercent,
    max_uses_per_user: maxUsesPerUser,
    activo,
    prioridad,
  };
}

export async function listDiscountRules() {
  const [rows] = await pool.query(
    `SELECT id, nombre, tipo, min_order_value, min_quantity, discount_percent, max_uses_per_user, activo, prioridad, creado_at, actualizado_at
     FROM discount_rules
     ORDER BY prioridad ASC, discount_percent DESC, id ASC`
  );

  return rows;
}

export async function createDiscountRule(payload) {
  const [result] = await pool.query(
    `INSERT INTO discount_rules
      (nombre, tipo, min_order_value, min_quantity, discount_percent, max_uses_per_user, activo, prioridad)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.nombre,
      payload.tipo,
      payload.min_order_value,
      payload.min_quantity,
      payload.discount_percent,
      payload.max_uses_per_user,
      payload.activo,
      payload.prioridad,
    ]
  );

  const [rows] = await pool.query(
    `SELECT id, nombre, tipo, min_order_value, min_quantity, discount_percent, max_uses_per_user, activo, prioridad, creado_at, actualizado_at
     FROM discount_rules WHERE id = ? LIMIT 1`,
    [result.insertId]
  );

  return rows[0] || null;
}

export async function updateDiscountRule(ruleId, payload) {
  const [result] = await pool.query(
    `UPDATE discount_rules
     SET nombre = ?, tipo = ?, min_order_value = ?, min_quantity = ?, discount_percent = ?, max_uses_per_user = ?, activo = ?, prioridad = ?
     WHERE id = ?`,
    [
      payload.nombre,
      payload.tipo,
      payload.min_order_value,
      payload.min_quantity,
      payload.discount_percent,
      payload.max_uses_per_user,
      payload.activo,
      payload.prioridad,
      ruleId,
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT id, nombre, tipo, min_order_value, min_quantity, discount_percent, max_uses_per_user, activo, prioridad, creado_at, actualizado_at
     FROM discount_rules WHERE id = ? LIMIT 1`,
    [ruleId]
  );

  return rows[0] || null;
}

async function countRuleUsesByCustomer({ ruleId, userId, email }) {
  if (!ruleId) return 0;

  if (userId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ordenes
       WHERE descuento_regla_id = ?
         AND usuario_id = ?
         AND payment_status <> 'rejected'`,
      [ruleId, userId]
    );
    return Number(rows[0]?.total || 0);
  }

  if (email) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ordenes
       WHERE descuento_regla_id = ?
         AND LOWER(cliente_email) = LOWER(?)
         AND payment_status <> 'rejected'`,
      [ruleId, email]
    );
    return Number(rows[0]?.total || 0);
  }

  return 0;
}

async function hasAnyCompletedOrder({ userId, email }) {
  if (userId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ordenes
       WHERE usuario_id = ?
         AND payment_status <> 'rejected'`,
      [userId]
    );
    return Number(rows[0]?.total || 0) > 0;
  }

  if (email) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ordenes
       WHERE LOWER(cliente_email) = LOWER(?)
         AND payment_status <> 'rejected'`,
      [email]
    );
    return Number(rows[0]?.total || 0) > 0;
  }

  return false;
}

export async function calculateBestDiscount({ subtotal, totalQuantity, userId = null, email = '' }) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const safeQuantity = Math.max(0, Math.floor(Number(totalQuantity || 0)));

  if (safeSubtotal <= 0 || safeQuantity <= 0) {
    return { amount: 0, rule: null, reason: 'no_items' };
  }

  const [rules] = await pool.query(
    `SELECT id, nombre, tipo, min_order_value, min_quantity, discount_percent, max_uses_per_user, activo, prioridad
     FROM discount_rules
     WHERE activo = TRUE
     ORDER BY prioridad ASC, discount_percent DESC, id ASC`
  );

  if (!rules.length) {
    return { amount: 0, rule: null, reason: 'no_rules' };
  }

  const isReturningCustomer = await hasAnyCompletedOrder({ userId, email });
  let best = null;

  for (const rule of rules) {
    if (rule.tipo === 'new_user' && isReturningCustomer) {
      continue;
    }

    if (rule.tipo === 'quantity') {
      if (safeQuantity < Number(rule.min_quantity || 0)) continue;
      if (safeSubtotal < Number(rule.min_order_value || 0)) continue;
    }

    if (rule.max_uses_per_user && rule.max_uses_per_user > 0) {
      const uses = await countRuleUsesByCustomer({
        ruleId: rule.id,
        userId,
        email,
      });
      if (uses >= Number(rule.max_uses_per_user)) {
        continue;
      }
    }

    const discountAmount = Math.round((safeSubtotal * Number(rule.discount_percent || 0))) / 100;
    if (discountAmount <= 0) continue;

    const candidate = {
      amount: Math.min(safeSubtotal, discountAmount),
      rule,
    };

    if (!best || candidate.amount > best.amount) {
      best = candidate;
    }
  }

  if (!best) {
    return { amount: 0, rule: null, reason: 'no_match' };
  }

  return {
    amount: Number(best.amount.toFixed(2)),
    rule: best.rule,
    reason: 'matched',
  };
}
