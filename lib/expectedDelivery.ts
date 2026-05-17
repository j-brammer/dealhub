import type { ShippingOptionId } from '@/data/shippingOptions';

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Inclusive business-day counts after the order (1 = next business day). */
export function businessDaysDeliveryRange(id: ShippingOptionId): { min: number; max: number } {
  switch (id) {
    case 'same_day':
      return { min: 0, max: 0 };
    case 'express':
      return { min: 1, max: 2 };
    case 'standard':
    default:
      return { min: 5, max: 7 };
  }
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Advance from `start` by N business days (Mon–Fri only). N ≥ 1. */
function addNBusinessDaysFromOrderDate(start: Date, n: number): Date {
  let cur = startOfLocalDay(start);
  let remaining = n;
  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) remaining -= 1;
  }
  const out = new Date(cur);
  out.setHours(randomInt(9, 19), randomInt(0, 59), randomInt(0, 59), 0);
  return out;
}

function sameDayDeliveryTarget(placed: Date): Date {
  const latest = new Date(placed);
  latest.setHours(21, 0, 0, 0);
  const min = new Date(placed.getTime() + 45 * 60 * 1000);
  if (min.getTime() >= latest.getTime()) {
    let t = startOfLocalDay(placed);
    t.setDate(t.getDate() + 1);
    while (isWeekend(t)) t.setDate(t.getDate() + 1);
    t.setHours(randomInt(9, 13), randomInt(0, 59), randomInt(0, 59), 0);
    return t;
  }
  const span = latest.getTime() - min.getTime();
  return new Date(min.getTime() + Math.random() * span);
}

/**
 * Random delivery moment: a random business-day count in the method's range, plus a random time of day.
 */
export function computeExpectedDeliveryAt(placedAt: Date, shippingId: ShippingOptionId): Date {
  const { min: minB, max: maxB } = businessDaysDeliveryRange(shippingId);
  const bizDays = randomInt(minB, maxB);
  if (bizDays === 0) {
    return sameDayDeliveryTarget(placedAt);
  }
  return addNBusinessDaysFromOrderDate(placedAt, bizDays);
}

export function computeExpectedDeliveryIso(placedAt: Date, shippingId: ShippingOptionId): string {
  return computeExpectedDeliveryAt(placedAt, shippingId).toISOString();
}

/** Deterministic fallback for orders saved before we stored expectedDeliveryAt. */
export function legacyExpectedDeliveryAt(placedAt: string, shippingId: ShippingOptionId): string {
  const placed = new Date(placedAt);
  const { max: maxB } = businessDaysDeliveryRange(shippingId);
  if (maxB === 0) {
    const d = new Date(placed);
    d.setHours(20, 0, 0, 0);
    return d.toISOString();
  }
  let cur = startOfLocalDay(placed);
  let remaining = maxB;
  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) remaining -= 1;
  }
  const out = new Date(cur);
  out.setHours(17, 0, 0, 0);
  return out.toISOString();
}

export function isDeliveredByExpectedAt(expectedDeliveryAt: string, nowMs: number = Date.now()): boolean {
  return nowMs >= new Date(expectedDeliveryAt).getTime();
}
