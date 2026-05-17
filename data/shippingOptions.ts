export type ShippingOptionId = 'same_day' | 'express' | 'standard';

export type ShippingOption = {
  id: ShippingOptionId;
  title: string;
  description: string;
  fee: number;
};

/** Static shipping speeds for checkout (fees are illustrative). */
export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'same_day',
    title: 'Same-Day',
    description: 'Order by 2pm for delivery today',
    fee: 34.99,
  },
  {
    id: 'express',
    title: '1–2 business days',
    description: 'Express delivery',
    fee: 12.99,
  },
  {
    id: 'standard',
    title: '5–7 business days',
    description: 'Standard delivery',
    fee: 0,
  },
];

export function shippingOptionById(id: ShippingOptionId): ShippingOption {
  return SHIPPING_OPTIONS.find((o) => o.id === id) ?? SHIPPING_OPTIONS[2];
}

export function inferShippingOptionIdFromOrder(shippingTitle: string | undefined, shippingFee: number): ShippingOptionId {
  const t = (shippingTitle ?? '').toLowerCase();
  if (t.includes('same-day') || t.includes('same day')) return 'same_day';
  if (t.includes('1–2') || t.includes('1-2')) return 'express';
  const match = SHIPPING_OPTIONS.find((o) => o.title === shippingTitle);
  if (match) return match.id;
  if (shippingFee >= 30) return 'same_day';
  if (shippingFee > 0) return 'express';
  return 'standard';
}
