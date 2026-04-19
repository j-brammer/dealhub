import type { EbayItemDetail, EbayItemSummary } from '@/data/mapEbayProduct';
import { mapEbayItemDetailToProduct, mapEbayItemSummaryToProduct } from '@/data/mapEbayProduct';
import type { Product } from '@/data/products';

function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_DEALHUB_API_URL ?? '';
  return raw.replace(/\/$/, '');
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return JSON.parse(text) as T;
}

export type SearchPageResult = {
  products: Product[];
  total: number;
  offset: number;
  limit: number;
};

/**
 * Fetches one page of item summaries from the Dealhub eBay proxy.
 */
export async function fetchEbaySearchPage(params: {
  slug: string;
  offset: number;
  limit: number;
  categoryNumericId?: number;
}): Promise<SearchPageResult> {
  const base = getBaseUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_DEALHUB_API_URL is not set. Add it to .env (see .env.example) with your Northflank backend URL.'
    );
  }
  const q = new URLSearchParams({
    slug: params.slug,
    offset: String(params.offset),
    limit: String(params.limit),
  });
  const res = await fetch(`${base}/search?${q}`);
  const data = await parseJson<{
    slug: string;
    offset: number;
    limit: number;
    total: number;
    itemSummaries: EbayItemSummary[];
  }>(res);
  const products = (data.itemSummaries ?? []).map((row) =>
    mapEbayItemSummaryToProduct(row, data.slug, params.categoryNumericId)
  );
  return {
    products,
    total: data.total ?? 0,
    offset: data.offset ?? params.offset,
    limit: data.limit ?? params.limit,
  };
}

/**
 * Fetches a single item from the proxy (eBay Browse get item).
 */
export async function fetchEbayItemById(
  itemId: string,
  categorySlug = 'all',
  categoryNumericId?: number
): Promise<Product> {
  const base = getBaseUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_DEALHUB_API_URL is not set. Add it to .env (see .env.example) with your Northflank backend URL.'
    );
  }
  const pathSeg = encodeURIComponent(itemId);
  const res = await fetch(`${base}/item/${pathSeg}`);
  const dto = await parseJson<EbayItemDetail>(res);
  return mapEbayItemDetailToProduct(dto, categorySlug, categoryNumericId);
}
