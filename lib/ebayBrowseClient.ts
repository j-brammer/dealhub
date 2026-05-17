import type { EbaySearchRefinement } from '@/data/ebayBrowseTypes';
import type { EbayItemDetail, EbayItemSummary } from '@/data/mapEbayProduct';
import { mapEbayItemDetailToProduct, mapEbayItemSummaryToProduct } from '@/data/mapEbayProduct';
import type { Product } from '@/data/products';

const DEFAULT_API_ROOT = 'https://api.ebay.com';

/** Must include `MATCHING_ITEMS` or eBay may return refinements only with no `itemSummaries`. */
const REFINEMENT_FIELDGROUPS =
  'MATCHING_ITEMS,ASPECT_REFINEMENTS,CATEGORY_REFINEMENTS,CONDITION_REFINEMENTS,BUYING_OPTION_REFINEMENTS';

function getApiRoot(): string {
  const raw = process.env.EXPO_PUBLIC_EBAY_API_ROOT ?? DEFAULT_API_ROOT;
  return raw.replace(/\/$/, '');
}

function identityOriginFromApiRoot(apiRoot: string): string {
  try {
    return new URL(apiRoot).origin;
  } catch {
    return 'https://api.ebay.com';
  }
}

let tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

/** OAuth client id/secret are ASCII; supports Hermes/Android without global `btoa`. */
function utf8ToBase64(s: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(s);
  }
  const Buf = (globalThis as unknown as { Buffer?: { from: (d: string, enc: string) => { toString: (enc: string) => string } } })
    .Buffer;
  if (Buf) {
    return Buf.from(s, 'utf8').toString('base64');
  }
  throw new Error('Base64 is not available (btoa/Buffer missing).');
}

function requireEbayCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.EXPO_PUBLIC_EBAY_CLIENT_ID ?? '';
  const clientSecret = process.env.EXPO_PUBLIC_EBAY_CLIENT_SECRET ?? '';
  if (!clientId || !clientSecret) {
    throw new Error(
      'Set EXPO_PUBLIC_EBAY_CLIENT_ID and EXPO_PUBLIC_EBAY_CLIENT_SECRET in .env (see .env.example).'
    );
  }
  return { clientId, clientSecret };
}

async function getApplicationAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 5000) {
    return tokenCache.accessToken;
  }
  const { clientId, clientSecret } = requireEbayCredentials();
  const apiRoot = getApiRoot();
  const tokenUrl = `${identityOriginFromApiRoot(apiRoot)}/identity/v1/oauth2/token`;
  const scope =
    process.env.EXPO_PUBLIC_EBAY_OAUTH_SCOPE ?? 'https://api.ebay.com/oauth/api_scope';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope,
  });
  const basic = utf8ToBase64(`${clientId}:${clientSecret}`);
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text) as { access_token: string; expires_in?: number };
  const expiresIn = Number(json.expires_in) || 7200;
  tokenCache = {
    accessToken: json.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };
  return tokenCache.accessToken;
}

async function ebayBrowseGet(pathWithQuery: string): Promise<unknown> {
  const token = await getApplicationAccessToken();
  const apiRoot = getApiRoot();
  const url = `${apiRoot}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
  const marketplaceId = process.env.EXPO_PUBLIC_EBAY_MARKETPLACE_ID ?? 'EBAY_US';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`eBay Browse error: ${res.status} ${text}`);
  }
  return JSON.parse(text) as unknown;
}

export type EbayItemSearchParams = {
  /** eBay category id (single). Omit or `all` for keyword-only search. */
  categoryId?: string;
  /** Keyword search (Browse `q`). Required by eBay when using L1 `category_ids`. */
  q: string;
  offset: number;
  limit: number;
  /** Passed through to `Product.categoryNumericId` for UI context. */
  categoryNumericId?: number;
  /** Browse `filter` string (comma-joined predicates). @see ref-buy-browse-filters */
  filter?: string;
  aspectFilter?: string;
  sort?: string;
  /** When true, response includes `refinement` (larger payload). */
  includeRefinements?: boolean;
};

export function buildItemSummarySearchPath(p: EbayItemSearchParams): string {
  const params = new URLSearchParams();
  const q = p.q.trim().slice(0, 100);
  if (q) params.set('q', q);
  if (p.categoryId && p.categoryId !== 'all') {
    params.set('category_ids', p.categoryId);
  }
  params.set('limit', String(Math.min(Math.max(p.limit, 1), 200)));
  params.set('offset', String(Math.max(p.offset, 0)));
  if (p.filter) params.set('filter', p.filter);
  if (p.aspectFilter) params.set('aspect_filter', p.aspectFilter);
  if (p.sort) params.set('sort', p.sort);
  if (p.includeRefinements) {
    params.set('fieldgroups', REFINEMENT_FIELDGROUPS);
  }
  return `/buy/browse/v1/item_summary/search?${params.toString()}`;
}

export type SearchPageResult = {
  products: Product[];
  total: number;
  offset: number;
  limit: number;
};

export type EbaySearchWithMeta = {
  page: SearchPageResult;
  refinement: EbaySearchRefinement | null;
};

/**
 * One page of live eBay item summaries plus optional refinement metadata (filters / facets).
 */
export async function fetchEbaySearchWithMeta(params: EbayItemSearchParams): Promise<EbaySearchWithMeta> {
  const path = buildItemSummarySearchPath(params);
  const data = (await ebayBrowseGet(path)) as {
    total?: number;
    itemSummaries?: EbayItemSummary[];
    refinement?: EbaySearchRefinement;
  };
  const itemSummaries = data.itemSummaries ?? [];
  const categoryKey = params.categoryId && params.categoryId !== 'all' ? params.categoryId : 'all';
  const products = itemSummaries.map((row) =>
    mapEbayItemSummaryToProduct(row, categoryKey, params.categoryNumericId)
  );
  return {
    page: {
      products,
      total: data.total ?? 0,
      offset: params.offset,
      limit: params.limit,
    },
    refinement: params.includeRefinements ? (data.refinement ?? null) : null,
  };
}

/** Convenience: items + pagination only (no refinement payload). */
export async function fetchEbaySearchPage(params: {
  categoryId?: string;
  q: string;
  offset: number;
  limit: number;
  categoryNumericId?: number;
  filter?: string;
  aspectFilter?: string;
  sort?: string;
}): Promise<SearchPageResult> {
  const { page } = await fetchEbaySearchWithMeta({ ...params, includeRefinements: false });
  return page;
}

/**
 * Single item from eBay Browse get item (live listing).
 */
export async function fetchEbayItemById(
  itemId: string,
  categorySlug = 'all',
  categoryNumericId?: number
): Promise<Product> {
  let decoded = itemId;
  try {
    decoded = decodeURIComponent(itemId);
  } catch {
    decoded = itemId;
  }
  const path = `/buy/browse/v1/item/${encodeURIComponent(decoded)}`;
  const dto = (await ebayBrowseGet(path)) as EbayItemDetail;
  return mapEbayItemDetailToProduct(dto, categorySlug, categoryNumericId);
}
