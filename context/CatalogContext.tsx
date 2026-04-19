import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { EBAY_STORE_CATEGORIES, type StoreCategory } from '@/data/ebayCategories';
import type { Product } from '@/data/products';
import { fetchEbayItemById, fetchEbaySearchPage } from '@/lib/ebayCatalogClient';

export type { StoreCategory } from '@/data/ebayCategories';

const PAGE_SIZE = 12;

type CatalogContextValue = {
  categories: StoreCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  feedItems: Product[];
  feedLoading: boolean;
  feedError: string | null;
  feedHasMore: boolean;
  /** `all` or category slug */
  feedCategorySlug: string;
  setFeedCategorySlug: (slug: string) => void;
  loadMoreFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  ensureProductLoaded: (id: string) => Promise<Product | undefined>;
  registerProducts: (list: Product[]) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories] = useState(EBAY_STORE_CATEGORIES);
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

  const feedOffsetRef = useRef(0);
  const feedRequestRef = useRef(0);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const getProductById = useCallback(
    (id: string) => productsById[id],
    [productsById]
  );

  const resolveCategoryNumericId = useCallback(
    (slug: string): number | undefined => {
      if (slug === 'all') return undefined;
      return categoriesRef.current.find((c) => c.slug === slug)?.numericId;
    },
    []
  );

  const refreshFeed = useCallback(async () => {
    const slug = feedCategorySlugRef.current;
    const req = ++feedRequestRef.current;
    feedOffsetRef.current = 0;
    setFeedItems([]);
    setFeedHasMore(true);
    setFeedError(null);
    setFeedLoading(true);
    try {
      const categoryNum = resolveCategoryNumericId(slug);
      const page = await fetchEbaySearchPage({
        slug,
        offset: 0,
        limit: PAGE_SIZE,
        categoryNumericId: categoryNum,
      });
      if (req !== feedRequestRef.current) return;
      mergeProducts(page.products);
      setFeedItems(page.products);
      feedOffsetRef.current = page.products.length;
      const loaded = page.offset + page.products.length;
      setFeedHasMore(loaded < page.total);
    } catch (e) {
      if (req !== feedRequestRef.current) return;
      setFeedError(e instanceof Error ? e.message : 'Failed to load products');
      setFeedHasMore(false);
    } finally {
      if (req === feedRequestRef.current) {
        setFeedLoading(false);
      }
    }
  }, [mergeProducts, resolveCategoryNumericId]);

  const loadMoreFeed = useCallback(async () => {
    const slug = feedCategorySlugRef.current;
    const req = feedRequestRef.current;
    if (feedLoading || !feedHasMore) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const categoryNum = resolveCategoryNumericId(slug);
      const offset = feedOffsetRef.current;
      const page = await fetchEbaySearchPage({
        slug,
        offset,
        limit: PAGE_SIZE,
        categoryNumericId: categoryNum,
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
      if (req === feedRequestRef.current) {
        setFeedLoading(false);
      }
    }
  }, [feedLoading, feedHasMore, mergeProducts, resolveCategoryNumericId]);

  const setFeedCategorySlug = useCallback((slug: string) => {
    if (slug === feedCategorySlugRef.current) return;
    feedRequestRef.current += 1;
    setFeedCategorySlugState(slug);
    feedCategorySlugRef.current = slug;
    feedOffsetRef.current = 0;
    setFeedItems([]);
    setFeedHasMore(true);
    setFeedError(null);
  }, []);

  useEffect(() => {
    void refreshFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshFeed identity can churn; slug is enough
  }, [feedCategorySlug]);

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
        const numId = categoriesRef.current.find((c) => c.slug === slug)?.numericId;
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
