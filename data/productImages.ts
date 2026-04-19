/**
 * Product imagery from API `imageUrl` with a neutral placeholder fallback.
 */

const PLACEHOLDER =
  'https://placehold.co/400x400/e2e8f0/64748b?text=DealHub';

export function getProductImageUrl(product: { imageUrl?: string }): string {
  const u = product.imageUrl?.trim();
  if (u && /^https:\/\//i.test(u)) return u;
  return PLACEHOLDER;
}

export function getProductImageCaption(product: { title: string; description?: string }): string {
  const d = product.description?.trim();
  if (d && d.length > 0) {
    return d.length > 160 ? `${d.slice(0, 157)}…` : d;
  }
  return `${product.title} — product photo`;
}
