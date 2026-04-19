import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCatalog } from '@/context/CatalogContext';
import type { Product } from '@/data/products';
import { fetchEbaySearchPage } from '@/lib/ebayCatalogClient';

const GAP = 10;
const H_PAD = 12;
const PAGE_SIZE = 12;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slug = String(id ?? '');
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { categories, categoriesLoading, registerProducts } = useCatalog();

  const category = useMemo(
    () => categories.find((x) => x.slug === slug || x.id === slug),
    [categories, slug]
  );

  const [items, setItems] = useState<Product[]>([]);
  const [apiOffset, setApiOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadLock = useRef(false);

  useEffect(() => {
    if (categoriesLoading) return;
    if (!category) {
      setLoading(false);
      setItems([]);
      setHasMore(false);
      setError(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setItems([]);
      setApiOffset(0);
      setHasMore(true);
      try {
        const page = await fetchEbaySearchPage({
          slug: category.slug,
          offset: 0,
          limit: PAGE_SIZE,
          categoryNumericId: category.numericId || undefined,
        });
        if (cancelled) return;
        registerProducts(page.products);
        setItems(page.products);
        setApiOffset(page.products.length);
        const loaded = page.offset + page.products.length;
        setHasMore(loaded < page.total);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [category, categoriesLoading, registerProducts]);

  const loadMore = useCallback(async () => {
    if (!category || loadLock.current || loadingMore || !hasMore || loading) return;
    loadLock.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchEbaySearchPage({
        slug: category.slug,
        offset: apiOffset,
        limit: PAGE_SIZE,
        categoryNumericId: category.numericId || undefined,
      });
      registerProducts(page.products);
      setItems((prev) => [...prev, ...page.products]);
      const nextOffset = apiOffset + page.products.length;
      setApiOffset(nextOffset);
      const loaded = apiOffset + page.products.length;
      setHasMore(page.products.length > 0 && loaded < page.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
      loadLock.current = false;
    }
  }, [category, apiOffset, hasMore, loading, loadingMore, registerProducts]);

  const gridColumnWidth = (windowWidth - H_PAD * 2 - GAP) / 2;

  const title = category ? `${category.emoji} ${category.label}` : 'Category';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: category?.label ?? 'Category', headerBackTitle: 'Back' }} />
      {!category && !categoriesLoading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.muted }]}>Unknown category.</Text>
        </View>
      ) : loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.muted }]}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.muted }]}>No products in this category yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          renderItem={({ item }: { item: Product }) => (
            <View style={[styles.gridCell, { width: gridColumnWidth }]}>
              <ProductCard product={item} />
            </View>
          )}
          columnWrapperStyle={styles.column}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 48 + insets.bottom }}
          ListHeaderComponent={
            <Text style={[styles.headline, { color: c.text, paddingHorizontal: H_PAD }]}>{title}</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={c.accent} />
              </View>
            ) : null
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: GAP,
    paddingHorizontal: H_PAD,
  },
  gridCell: { flexGrow: 0, flexShrink: 0 },
  headline: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  footer: { paddingVertical: 20, alignItems: 'center' },
});
