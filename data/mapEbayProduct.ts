import type { Product } from '@/data/products';

export type EbayMoney = {
  value?: string;
  currency?: string;
};

export type EbayImage = {
  imageUrl?: string;
};

export type EbayItemSummary = {
  itemId: string;
  title?: string;
  image?: EbayImage;
  thumbnailImages?: EbayImage[];
  price?: EbayMoney;
  marketingPrice?: {
    originalPrice?: EbayMoney;
  };
  shortDescription?: string;
  itemWebUrl?: string;
};

export type EbayItemDetail = EbayItemSummary & {
  description?: string;
  additionalImages?: EbayImage[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePrice(m?: EbayMoney): number {
  if (!m?.value) return 0;
  const n = Number.parseFloat(String(m.value));
  return Number.isFinite(n) ? n : 0;
}

function hashToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickImages(dto: EbayItemSummary | EbayItemDetail): string[] {
  const urls: string[] = [];
  const primary = dto.image?.imageUrl;
  if (primary) urls.push(primary);
  const thumbs = dto.thumbnailImages ?? [];
  for (const t of thumbs) {
    if (t.imageUrl && !urls.includes(t.imageUrl)) urls.push(t.imageUrl);
  }
  const addl = (dto as EbayItemDetail).additionalImages ?? [];
  for (const a of addl) {
    if (a.imageUrl && !urls.includes(a.imageUrl)) urls.push(a.imageUrl);
  }
  return urls.filter((u) => /^https:\/\//i.test(u.trim()));
}

/**
 * Maps eBay Browse item summary to app `Product`.
 * @param categorySlug feed or category slug used for this listing (not always eBay's taxonomy).
 */
export function mapEbayItemSummaryToProduct(
  dto: EbayItemSummary,
  categorySlug: string,
  categoryNumericId?: number
): Product {
  const id = dto.itemId;
  const h = hashToInt(id);
  const price = round2(parsePrice(dto.price));
  const orig = dto.marketingPrice?.originalPrice;
  const compareRaw = orig ? round2(parsePrice(orig)) : round2(price * (1.08 + (h % 5) * 0.02));
  const compareAtPrice = compareRaw > price ? compareRaw : undefined;
  const rating = round2(3.6 + (h % 14) / 10);
  const reviewCount = 200 + (h * 7919) % 89000;
  const tag =
    h % 11 === 0 ? 'Lightning deal' : h % 9 === 0 ? 'Best seller' : h % 13 === 0 ? 'New' : undefined;
  const urls = pickImages(dto);

  return {
    id,
    title: (dto.title ?? 'Item').trim() || 'Item',
    price,
    compareAtPrice,
    rating,
    reviewCount,
    categoryId: categorySlug,
    categoryNumericId,
    imageUrl: urls[0],
    imageUrls: urls.length ? urls : undefined,
    description: dto.shortDescription,
    slug: categorySlug,
    tag,
  };
}

export function mapEbayItemDetailToProduct(
  dto: EbayItemDetail,
  categorySlug: string,
  categoryNumericId?: number
): Product {
  const base = mapEbayItemSummaryToProduct(dto, categorySlug, categoryNumericId);
  const desc = dto.description ?? dto.shortDescription;
  const imgs = pickImages(dto);
  return {
    ...base,
    description: desc ?? base.description,
    imageUrls: imgs.length ? imgs : base.imageUrls,
    imageUrl: imgs[0] ?? base.imageUrl,
  };
}
