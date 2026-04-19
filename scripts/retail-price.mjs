/**
 * Retail-style USD prices for demo seeding:
 * - Two decimal places (explicit cents, never whole dollars only).
 * - Dollar ones digit ≠ 0 (e.g. $127.43 ok; $120.43 bad).
 * - Dime and penny digits both ≠ 0 (e.g. .43 ok; .40 or .03 bad).
 */

/** Rough USD bounds per category (before formatting rules). */
export const CATEGORY_PRICE_BOUNDS_USD = {
  clothes: [18, 229],
  shoes: [34, 279],
  electronics: [19, 899],
  furniture: [49, 1699],
  fashion: [12, 319],
  miscellaneous: [11, 249],
};

/** Cents 11–99 where dime and penny digits are both 1–9 (81 values). */
const VALID_CENTS = (() => {
  const out = [];
  for (let d = 1; d <= 9; d++) {
    for (let u = 1; u <= 9; u++) {
      out.push(d * 10 + u);
    }
  }
  return out;
})();

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function collectValidPricesInRange(loN, hiN, w0, w1) {
  const out = [];
  const wStart = Math.max(0, w0);
  const wEnd = Math.min(99999, w1);
  for (let w = wStart; w <= wEnd; w++) {
    if (w % 10 === 0) continue;
    for (const c of VALID_CENTS) {
      const p = w + c * 0.01;
      if (p >= loN - 1e-9 && p <= hiN + 1e-9) {
        out.push(p);
      }
    }
  }
  return out;
}

/**
 * Closest price in [lo, hi] satisfying digit rules (may expand range slightly if empty).
 */
export function finalizeRetailUsd(raw, lo, hi) {
  const loN = Number(lo);
  const hiN = Number(hi);
  if (!Number.isFinite(loN) || !Number.isFinite(hiN) || hiN < loN) {
    return 87.79;
  }

  const target = clamp(Number(raw) || (loN + hiN) / 2, loN, hiN);

  let loAdj = loN;
  let hiAdj = hiN;
  let list = [];

  for (let step = 0; step < 120 && list.length === 0; step++) {
    const w0 = Math.floor(loAdj) - 2;
    const w1 = Math.ceil(hiAdj) + 2;
    list = collectValidPricesInRange(loAdj, hiAdj, w0, w1);
    if (list.length > 0) break;
    loAdj -= 1;
    hiAdj += 1;
  }

  if (list.length === 0) {
    list = collectValidPricesInRange(loN - 500, hiN + 500, 1, 99999);
  }

  if (list.length === 0) {
    return roundMoney(clamp(target, loN, hiN));
  }

  let best = list[0];
  let bestD = Math.abs(best - target);
  for (const p of list) {
    const d = Math.abs(p - target);
    if (d < bestD - 1e-12) {
      bestD = d;
      best = p;
    }
  }
  return roundMoney(best);
}

/** Raw USD before formatting: model hint or deterministic fallback from picsum id. */
export function rawPriceCandidate(row, categorySlug) {
  const bounds = CATEGORY_PRICE_BOUNDS_USD[categorySlug] || CATEGORY_PRICE_BOUNDS_USD.miscellaneous;
  const [lo, hi] = bounds;

  let n = row.suggestedPriceUsd;
  if (typeof n === 'string') {
    const p = parseFloat(String(n).replace(/[^0-9.-]/g, ''));
    n = Number.isFinite(p) ? p : NaN;
  }
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
    return clamp(n, lo, hi);
  }

  const id = Number(row.picsumId) || 0;
  const mid = (lo + hi) / 2;
  const spread = (hi - lo) * 0.38;
  const jitter = ((id % 97) / 97 - 0.5) * spread;
  return clamp(mid + jitter, lo, hi);
}

/** Open-edition / poster-style print band (same digit rules as other retail prices). */
export const ART_PRINT_PRICE_BOUNDS_USD = [27, 329];

/** Random raw price in the art-print band, snapped to valid retail-style cents. */
export function randomArtPrintRetailUsd() {
  const [lo, hi] = ART_PRINT_PRICE_BOUNDS_USD;
  const raw = lo + Math.random() * (hi - lo);
  return finalizeRetailUsd(raw, lo, hi);
}

export function platziPriceForRow(row, categorySlug) {
  const bounds = CATEGORY_PRICE_BOUNDS_USD[categorySlug] || CATEGORY_PRICE_BOUNDS_USD.miscellaneous;
  return finalizeRetailUsd(rawPriceCandidate(row, categorySlug), bounds[0], bounds[1]);
}
