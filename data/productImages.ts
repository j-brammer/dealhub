/**
 * Product imagery from API `imageUrl` with a neutral placeholder fallback.
 */

const PLACEHOLDER =
  'https://placehold.co/400x400/e2e8f0/64748b?text=DealHub';

const EBAY_IMG_HOST = /^https:\/\/i\.ebayimg\.com\//i;
/** eBay long-edge tokens (e.g. s-l225); Browse often returns small ones that blur on full-width screens. */
const EBAY_SL_TOKEN = /s-l(\d+)(?=\.(jpe?g|png|webp)(?:\?|#|$))/gi;

/**
 * Prefer a large gallery asset on eBay’s CDN so list + detail views aren’t upscaling tiny bitmaps.
 */
export function preferLargeProductImageUrl(url: string): string {
  let u = url.trim();
  if (!EBAY_IMG_HOST.test(u)) return u;
  u = u.replace(/\/thumbs\/images\//i, '/images/');
  u = u.replace(EBAY_SL_TOKEN, (_, digits: string) => {
    const cur = Number.parseInt(digits, 10);
    if (!Number.isFinite(cur) || cur >= 1280) return `s-l${digits}`;
    return 's-l1600';
  });
  return u;
}

export function getProductImageUrl(product: { imageUrl?: string }): string {
  const u = product.imageUrl?.trim();
  if (u && /^https:\/\//i.test(u)) return preferLargeProductImageUrl(u);
  return PLACEHOLDER;
}

export function getProductImageCaption(product: { title: string; description?: string }): string {
  const d = product.description?.trim();
  if (d && d.length > 0) {
    return d.length > 160 ? `${d.slice(0, 157)}…` : d;
  }
  return `${product.title} — product photo`;
}
