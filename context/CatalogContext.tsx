import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { EbaySearchRefinement } from '@/data/ebayBrowseTypes';
import { parseRefinementHref } from '@/data/ebayBrowseTypes';
import {
  defaultKeywordsForCategoryLabel,
  EBAY_US_ROOT_CATEGORIES,
  type StoreCategory,
} from '@/data/ebayUsRootCategories';
import type { Product } from '@/data/products';
import { fetchEbayItemById, fetchEbaySearchWithMeta } from '@/lib/ebayBrowseClient';

export type { StoreCategory } from '@/data/ebayUsRootCategories';

const PAGE_SIZE = 12;

function defaultMarketplaceQuery(): string {
  return (process.env.EXPO_PUBLIC_EBAY_DEFAULT_Q ?? 'deals').trim().slice(0, 100) || 'deals';
}

type CatalogContextValue = {
  categories: StoreCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  feedItems: Product[];
  feedLoading: boolean;
  feedError: string | null;
  feedHasMore: boolean;
  /** `all` or eBay root category id string */
  feedCategorySlug: string;
  setFeedCategorySlug: (slug: string) => void;
  /** Keyword narrow (combined with department default keywords when not `all`). */
  feedQueryText: string;
  setFeedQueryText: (t: string) => void;
  /** Raw Browse `filter` string (eBay field filters). */
  browseFilter?: string;
  setBrowseFilter: (f: string | undefined) => void;
  /** Browse `aspect_filter` string (from refinement hrefs). */
  browseAspectFilter?: string;
  /** Latest refinement metadata from eBay (facets / distributions). */
  lastRefinement: EbaySearchRefinement | null;
  /** Apply a `refinementHref` from search refinements (updates category / q / filters from eBay). */
  applyRefinementHref: (href: string) => void;
  loadMoreFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  ensureProductLoaded: (id: string) => Promise<Product | undefined>;
  registerProducts: (list: Product[]) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories] = useState(EBAY_US_ROOT_CATEGORIES);
  const categoriesLoading = false;
  const categoriesError = null as string | null;

  const [productsById, setProductsById] = useState<Record<string, Product>>({});
  const productsByIdRef = useRef(productsById);
  useEffect(() => {
    productsByIdRef.current = productsById;
  }, [productsById]);

  const mergeProducts = useCallback((list: Product[]) => {
    if (list.length === 0) return;
    setProductsById((prev) => {
      const next = { ...prev };
      for (const p of list) {
        next[p.id] = p;
      }
      return next;
    });
  }, []);

  const [feedItems, setFeedItems] = useState<Product[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedCategorySlug, setFeedCategorySlugState] = useState('all');
  const feedCategorySlugRef = useRef(feedCategorySlug);
  feedCategorySlugRef.current = feedCategorySlug;

  const [feedQueryText, setFeedQueryText] = useState('');
  const [browseFilter, setBrowseFilterState] = useState<string | undefined>(undefined);
  const [browseAspectFilter, setBrowseAspectFilter] = useState<string | undefined>(undefined);
  const [lastRefinement, setLastRefinement] = useState<EbaySearchRefinement | null>(null);

  const setBrowseFilter = useCallback((f: string | undefined) => {
    setBrowseFilterState(f);
    setBrowseAspectFilter(undefined);
  }, []);

  const feedOffsetRef = useRef(0);
  const feedRequestRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const loadMoreInFlightRef = useRef(false);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const getProductById = useCallback(
    (id: string) => productsById[id],
    [productsById]
  );

  const effectiveSearchQ = useCallback((): string => {
    const slug = feedCategorySlugRef.current;
    if (slug === 'all') {
      return feedQueryText.trim().slice(0, 100) || defaultMarketplaceQuery();
    }
    const cat = categoriesRef.current.find((c) => c.id === slug);
    const base = cat ? defaultKeywordsForCategoryLabel(cat.label) : defaultMarketplaceQuery();
    const extra = feedQueryText.trim();
    return extra ? `${base} ${extra}`.slice(0, 100) : base;
  }, [feedQueryText]);

  const resolveCategoryNumericId = useCallback((slug: string): number | undefined => {
    if (slug === 'all') return undefined;
    return categoriesRef.current.find((c) => c.id === slug)?.numericId;
  }, []);

  const refreshFeed = useCallback(async () => {
    const slug = feedCategorySlugRef.current;
    const req = ++feedRequestRef.current;
    refreshInFlightRef.current = true;
    loadMoreInFlightRef.current = false;
    feedOffsetRef.current = 0;
    setFeedItems([]);
    setFeedHasMore(true);
    setFeedError(null);
    setFeedLoading(true);
    try {
      const q = effectiveSearchQ();
      const { page, refinement } = await fetchEbaySearchWithMeta({
        categoryId: slug === 'all' ? undefined : slug,
        q,
        offset: 0,
        limit: PAGE_SIZE,
        categoryNumericId: resolveCategoryNumericId(slug),
        filter: browseFilter,
        aspectFilter: browseAspectFilter,
        includeRefinements: true,
      });
      if (req !== feedRequestRef.current) return;
      mergeProducts(page.products);
      setFeedItems(page.products);
      feedOffsetRef.current = page.products.length;
      const loaded = page.offset + page.products.length;
      setFeedHasMore(loaded < page.total);
      setLastRefinement(refinement);
    } catch (e) {
      if (req !== feedRequestRef.current) return;
      setFeedError(e instanceof Error ? e.message : 'Failed to load products');
      setFeedHasMore(false);
      setLastRefinement(null);
    } finally {
      refreshInFlightRef.current = false;
      if (req === feedRequestRef.current) {
        setFeedLoading(false);
      }
    }
  }, [mergeProducts, resolveCategoryNumericId, effectiveSearchQ, browseFilter, browseAspectFilter]);

  const refreshFeedRef = useRef(refreshFeed);
  refreshFeedRef.current = refreshFeed;

  const loadMoreFeed = useCallback(async () => {
    if (!feedHasMore || refreshInFlightRef.current || loadMoreInFlightRef.current) return;
    const slug = feedCategorySlugRef.current;
    const req = feedRequestRef.current;
    loadMoreInFlightRef.current = true;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const q = effectiveSearchQ();
      const offset = feedOffsetRef.current;
      const { page } = await fetchEbaySearchWithMeta({
        categoryId: slug === 'all' ? undefined : slug,
        q,
        offset,
        limit: PAGE_SIZE,
        categoryNumericId: resolveCategoryNumericId(slug),
        filter: browseFilter,
        aspectFilter: browseAspectFilter,
        includeRefinements: false,
      });
      if (req !== feedRequestRef.current) return;
      mergeProducts(page.products);
      setFeedItems((prev) => [...prev, ...page.products]);
      feedOffsetRef.current += page.products.length;
      const loaded = offset + page.products.length;
      setFeedHasMore(page.products.length > 0 && loaded < page.total);
    } catch (e) {
      if (req === feedRequestRef.current) {
        setFeedError(e instanceof Error ? e.message : 'Failed to load more');
      }
    } finally {
      loadMoreInFlightRef.current = false;
      if (req === feedRequestRef.current) {
        setFeedLoading(false);
      }
    }
  }, [feedHasMore, mergeProducts, resolveCategoryNumericId, effectiveSearchQ, browseFilter, browseAspectFilter]);

  const setFeedCategorySlug = useCallback((slug: string) => {
    if (slug === feedCategorySlugRef.current) return;
    feedRequestRef.current += 1;
    loadMoreInFlightRef.current = false;
    setFeedCategorySlugState(slug);
    feedCategorySlugRef.current = slug;
    feedOffsetRef.current = 0;
    setFeedItems([]);
    setFeedHasMore(true);
    setFeedError(null);
    setFeedQueryText('');
    setBrowseFilterState(undefined);
    setBrowseAspectFilter(undefined);
    setLastRefinement(null);
  }, []);

  const applyRefinementHref = useCallback((href: string) => {
    const p = parseRefinementHref(href);
    feedRequestRef.current += 1;
    loadMoreInFlightRef.current = false;
    if (p.category_ids) {
      setFeedCategorySlugState(p.category_ids);
      feedCategorySlugRef.current = p.category_ids;
    }
    if (p.q != null) setFeedQueryText(p.q);
    setBrowseFilterState(p.filter ?? undefined);
    setBrowseAspectFilter(p.aspect_filter ?? undefined);
    feedOffsetRef.current = 0;
    setFeedItems([]);
    setFeedHasMore(true);
    setFeedError(null);
  }, []);

  useEffect(() => {
    const debounceMs =
      feedCategorySlug === 'all' && feedQueryText.trim().length > 0 ? 420 : 0;
    const t = setTimeout(() => {
      void refreshFeedRef.current();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [feedCategorySlug, feedQueryText, browseFilter, browseAspectFilter]);

  const ensureProductLoaded = useCallback(
    async (id: string) => {
      const cached = productsByIdRef.current[id];
      if (cached) return cached;
      let decoded = id;
      try {
        decoded = decodeURIComponent(id);
      } catch {
        decoded = id;
      }
      try {
        const slug = feedCategorySlugRef.current;
        const numId = categoriesRef.current.find((c) => c.id === slug)?.numericId;
        const p = await fetchEbayItemById(decoded, slug, numId);
        mergeProducts([p]);
        return p;
      } catch {
        return undefined;
      }
    },
    [mergeProducts]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      categories,
      categoriesLoading,
      categoriesError,
      feedItems,
      feedLoading,
      feedError,
      feedHasMore,
      feedCategorySlug,
      setFeedCategorySlug,
      feedQueryText,
      setFeedQueryText,
      browseFilter,
      setBrowseFilter,
      browseAspectFilter,
      lastRefinement,
      applyRefinementHref,
      loadMoreFeed,
      refreshFeed,
      getProductById,
      ensureProductLoaded,
      registerProducts: mergeProducts,
    }),
    [
      categories,
      categoriesLoading,
      categoriesError,
      feedItems,
      feedLoading,
      feedError,
      feedHasMore,
      feedCategorySlug,
      setFeedCategorySlug,
      feedQueryText,
      browseFilter,
      browseAspectFilter,
      lastRefinement,
      applyRefinementHref,
      loadMoreFeed,
      refreshFeed,
      getProductById,
      ensureProductLoaded,
      mergeProducts,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
