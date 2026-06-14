export const STORE_CURRENCY = 'COP';
export const LEGACY_USD_TO_COP_RATE = 4000;
export const LEGACY_PRICE_THRESHOLD = 5000;
export const FREE_SHIPPING_THRESHOLD_COP = 1600000;
export const STANDARD_SHIPPING_FEE_COP = 180000;

export function normalizePrice(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (amount < LEGACY_PRICE_THRESHOLD) {
    return Math.round(amount * LEGACY_USD_TO_COP_RATE);
  }

  return Math.round(amount);
}

export function calculateShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD_COP ? 0 : STANDARD_SHIPPING_FEE_COP;
}