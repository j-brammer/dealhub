const dealOrange = '#FF6B00';
const dealOrangeDark = '#E85D04';

const light = {
  text: '#111827',
  /** Screen chrome — a few steps darker than gray-100 for calmer contrast with white cards. */
  background: '#E5E7EB',
  tint: dealOrange,
  tabIconDefault: '#9CA3AF',
  tabIconSelected: dealOrange,
  card: '#FFFFFF',
  border: '#D1D5DB',
  muted: '#6B7280',
  price: '#DC2626',
  priceStrike: '#9CA3AF',
  banner: '#FFF7ED',
  accent: dealOrange,
  accentPressed: dealOrangeDark,
  deliveredBadge: '#DCFCE7',
  deliveredBadgeText: '#166534',
};

const dark = {
  text: '#FAFAFA',
  /** Near-black page chrome; cards sit a step above for separation. */
  background: '#09090B',
  tint: dealOrange,
  tabIconDefault: '#71717A',
  tabIconSelected: dealOrange,
  card: '#18181B',
  border: '#52525B',
  muted: '#A1A1AA',
  price: '#F87171',
  priceStrike: '#71717A',
  /** Warm dark surface echoing light orange banner. */
  banner: '#271E16',
  accent: dealOrange,
  accentPressed: dealOrangeDark,
  deliveredBadge: '#14532D',
  deliveredBadgeText: '#86EFAC',
};

export default {
  light,
  dark,
};

export { dealOrange, dealOrangeDark };
