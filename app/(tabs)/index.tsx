import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCatalog } from '@/context/CatalogContext';
import { useWallet } from '@/context/WalletContext';
import type { Product } from '@/data/products';

const H_PAD = 12;
const GAP = 10;

function DealPill({ label, sub, scheme }: { label: string; sub: string; scheme: 'light' | 'dark' }) {
  const c = Colors[scheme];
  return (
    <View style={[styles.pill, { backgroundColor: c.banner, borderColor: c.border }]}>
      <Text style={[styles.pillLabel, { color: c.accent }]}>{label}</Text>
      <Text style={[styles.pillSub, { color: c.muted }]}>{sub}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { hydrated, storeCredit } = useWallet();
  const {
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
  } = useCatalog();

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const loadMoreLock = useRef(false);

  const categoryTriggerLabel =
    feedCategorySlug === 'all'
      ? 'All categories'
      : categories.find((x) => x.slug === feedCategorySlug)?.label ?? 'Category';

  const dealCountLabel =
    feedItems.length === 0
      ? '0 deals'
      : feedHasMore
        ? `${feedItems.length}+ deals`
        : `${feedItems.length} deals`;

  const loadMore = useCallback(() => {
    if (loadMoreLock.current || !feedHasMore || feedLoading) return;
    loadMoreLock.current = true;
    void loadMoreFeed().finally(() => {
      setTimeout(() => {
        loadMoreLock.current = false;
      }, 400);
    });
  }, [feedHasMore, feedLoading, loadMoreFeed]);

  const dropdownOptions = useMemo(
    () => [
      { id: 'all' as const, label: 'All categories', emoji: '🛒' },
      ...categories.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    ],
    [categories]
  );

  /** Fixed column width so a lone cell never stretches full-width (iOS FlatList quirk). */
  const gridColumnWidth = useMemo(
    () => (windowWidth - H_PAD * 2 - GAP) / 2,
    [windowWidth]
  );

  const ListHeader = useMemo(() => {
    const colors = Colors[scheme];
    return (
      <View style={{ backgroundColor: colors.background }}>
        <View style={[styles.topBar, { paddingHorizontal: H_PAD }]}>
          <View>
            <Text style={[styles.logo, { color: colors.text }]}>DealHub</Text>
            {hydrated && storeCredit > 0 ? (
              <View
                style={[styles.creditPill, { backgroundColor: colors.banner, borderColor: colors.border }]}>
                <Text style={[styles.creditPillText, { color: colors.accent }]}>
                  Credit ${storeCredit.toFixed(2)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.topIcons}>
            <Pressable hitSlop={8}>
              <FontAwesome name="bell-o" size={22} color={colors.text} />
            </Pressable>
            <Pressable hitSlop={8}>
              <FontAwesome name="comment-o" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.searchRow, { paddingHorizontal: H_PAD }]}>
          <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="search" size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search deals, brands, categories"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              editable={false}
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.dealsStrip, { paddingHorizontal: H_PAD }]}>
          <DealPill label="Lightning deals" sub="Ends in 2h" scheme={scheme} />
          <DealPill label="Free shipping" sub="$0 min today" scheme={scheme} />
          <DealPill label="New user bonus" sub="Extra 20% off" scheme={scheme} />
        </ScrollView>
        <View style={[styles.sectionHead, { paddingHorizontal: H_PAD }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shop by category</Text>
        </View>
        <View style={{ paddingHorizontal: H_PAD, paddingBottom: 12 }}>
          <Pressable
            onPress={() => setCategoryMenuOpen(true)}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}>
            <Text style={[styles.dropdownTriggerText, { color: colors.text }]} numberOfLines={1}>
              {categoryTriggerLabel}
            </Text>
            <FontAwesome name="chevron-down" size={16} color={colors.muted} />
          </Pressable>
        </View>
        {categoriesError ? (
          <Text style={[styles.bannerErr, { color: colors.price, paddingHorizontal: H_PAD }]}>
            Categories: {categoriesError}
          </Text>
        ) : null}
        {feedError ? (
          <Text style={[styles.bannerErr, { color: colors.price, paddingHorizontal: H_PAD }]}>
            {feedError}
          </Text>
        ) : null}
        <View style={[styles.sectionHead, { paddingHorizontal: H_PAD, marginTop: 4 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for you</Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>
            {dealCountLabel}
            {feedCategorySlug !== 'all' ? ` · ${categoryTriggerLabel}` : ''}
          </Text>
        </View>
      </View>
    );
  }, [
    scheme,
    hydrated,
    storeCredit,
    categoryTriggerLabel,
    dealCountLabel,
    feedCategorySlug,
    categoriesError,
    feedError,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={[styles.gridCell, { width: gridColumnWidth }]}>
        <ProductCard product={item} />
      </View>
    ),
    [gridColumnWidth]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <FlatList
        key={feedCategorySlug}
        data={feedItems}
        keyExtractor={(p) => p.id}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          categoriesLoading || (feedLoading && feedItems.length === 0) ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator size="large" color={c.accent} />
              <Text style={[styles.feedLoadingText, { color: c.muted }]}>Loading deals…</Text>
            </View>
          ) : (
            <View style={styles.feedLoading}>
              <Text style={[styles.feedLoadingText, { color: c.muted }]}>No products to show.</Text>
            </View>
          )
        }
        ListFooterComponent={
          feedItems.length > 0 && feedLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : null
        }
        columnWrapperStyle={styles.column}
        contentContainerStyle={
          feedItems.length === 0 ? { flexGrow: 1, paddingBottom: 72 + insets.bottom } : { paddingBottom: 72 + insets.bottom }
        }
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        removeClippedSubviews
        windowSize={7}
      />

      <Modal
        visible={categoryMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCategoryMenuOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Choose category</Text>
            <FlatList
              data={dropdownOptions}
              keyExtractor={(o) => o.id}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setFeedCategorySlug(item.id);
                    setCategoryMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    { borderBottomColor: c.border },
                    { backgroundColor: pressed ? c.background : 'transparent' },
                  ]}>
                  <Text style={styles.modalRowEmoji}>{item.emoji}</Text>
                  <Text style={[styles.modalRowLabel, { color: c.text }]}>{item.label}</Text>
                  {feedCategorySlug === item.id ? (
                    <FontAwesome name="check" size={18} color={c.accent} style={styles.modalCheck} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  creditPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  creditPillText: { fontSize: 12, fontWeight: '800' },
  topIcons: { flexDirection: 'row', gap: 18 },
  searchRow: { marginBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  dealsStrip: { gap: 10, paddingBottom: 16 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 140,
  },
  pillLabel: { fontWeight: '800', fontSize: 14 },
  pillSub: { fontSize: 12, marginTop: 2 },
  sectionHead: { marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: 4 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownTriggerText: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 8 },
  column: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: GAP,
    paddingHorizontal: H_PAD,
  },
  gridCell: {
    flexGrow: 0,
    flexShrink: 0,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    marginHorizontal: 12,
    marginBottom: 24,
    maxHeight: '52%',
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalList: { flexGrow: 0 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowEmoji: { fontSize: 22, width: 36 },
  modalRowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  modalCheck: { marginLeft: 8 },
  bannerErr: { fontSize: 13, marginBottom: 8 },
  feedLoading: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: H_PAD,
  },
  feedLoadingText: { marginTop: 12, fontSize: 15 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
