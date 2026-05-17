import type { Product } from '@/data/products';

export type EbayMoney = {
  value?: string;
  currency?: string;
};

export type EbayImage = {
  imageUrl?: string;
};

export type EbaySeller = {
  username?: string;
  feedbackPercentage?: string;
  feedbackScore?: number;
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
  seller?: EbaySeller;
  condition?: string;
  conditionId?: string;
  buyingOptions?: string[];
  topRatedBuyingExperience?: boolean;
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

function ratingFromSeller(s?: EbaySeller): { rating: number; reviewCount: number } | null {
  if (!s) return null;
  const pct = Number.parseFloat(String(s.feedbackPercentage ?? '').replace(/%/g, ''));
  const score = Number(s.feedbackScore);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  const rating = round2((pct / 100) * 5);
  const reviewCount = Number.isFinite(score) && score >= 0 ? score : 0;
  return { rating, reviewCount };
}

function tagFromListing(dto: EbayItemSummary, h: number): string | undefined {
  if (dto.topRatedBuyingExperience) return 'Top Rated Plus';
  if (dto.condition === 'New' || dto.conditionId === '1000') return 'New';
  const opts = dto.buyingOptions ?? [];
  if (opts.includes('AUCTION') && !opts.includes('FIXED_PRICE')) return 'Auction';
  if (opts.includes('FIXED_PRICE')) return 'Buy It Now';
  if (h % 17 === 0) return 'Deal';
  return undefined;
}

/**
 * Maps eBay Browse item summary to app `Product` (live listing fields when present).
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
  const fromSeller = ratingFromSeller(dto.seller);
  const rating = fromSeller?.rating ?? round2(3.6 + (h % 14) / 10);
  const reviewCount = fromSeller?.reviewCount ?? 200 + (h * 7919) % 89000;
  const tag = tagFromListing(dto, h);
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
