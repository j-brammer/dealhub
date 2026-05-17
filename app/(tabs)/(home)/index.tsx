import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { CreditPrizeWheelModal } from '@/components/CreditPrizeWheelModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCatalog } from '@/context/CatalogContext';
import { useWallet } from '@/context/WalletContext';
import type { Product } from '@/data/products';

const H_PAD = 12;
const GAP = 10;

function SpinningWheelIcon({ color, size = 20 }: { color: string; size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  /** Six saturated primaries — indigo omitted so blue vs purple read clearly at small size. */
  const dotColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#2563EB', '#A855F7'];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      spin.setValue(0);
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ring = size * 0.45;
  const dotSize = Math.max(4, Math.round(size * 0.24));
  const haloPad = Math.max(2, Math.round(dotSize * 0.2));
  const haloSize = dotSize + haloPad * 2;
  const center = size / 2;
  const hubRing = dotSize * 1.35;
  const hubDot = Math.max(3, Math.round(dotSize * 0.45));

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      {dotColors.map((dotColor, i) => {
        const theta = (2 * Math.PI * i) / dotColors.length - Math.PI / 2;
        const x = center + ring * Math.cos(theta) - haloSize / 2;
        const y = center + ring * Math.sin(theta) - haloSize / 2;
        return (
          <View
            key={`${dotColor}-${i}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              backgroundColor: '#141416',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
              }}
            />
          </View>
        );
      })}
      <View
        style={{
          position: 'absolute',
          left: center - hubRing / 2,
          top: center - hubRing / 2,
          width: hubRing,
          height: hubRing,
          borderRadius: hubRing / 2,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: center - hubDot / 2,
          top: center - hubDot / 2,
          width: hubDot,
          height: hubDot,
          borderRadius: hubDot / 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
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
    feedQueryText,
    setFeedQueryText,
    browseFilter,
    setBrowseFilter,
    lastRefinement,
    applyRefinementHref,
    loadMoreFeed,
  } = useCatalog();

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const loadMoreLock = useRef(false);

  const closePrizeWheel = useCallback(() => {
    setWheelOpen(false);
  }, []);

  const goAccountToLoadCredit = useCallback(() => {
    router.push('/(tabs)/account');
  }, [router]);

  const goAccountFromWheel = useCallback(() => {
    closePrizeWheel();
    router.push('/(tabs)/account');
  }, [closePrizeWheel, router]);

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
      ...categories.filter((c) => c.id !== 'all').map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    ],
    [categories]
  );

  const categoryTrigger = useMemo(() => {
    const opt = dropdownOptions.find((o) => o.id === feedCategorySlug);
    return {
      label: opt?.label ?? 'Category',
      emoji: opt?.emoji ?? '📦',
    };
  }, [dropdownOptions, feedCategorySlug]);

  const quickBrowseFilters = useMemo(
    () => [
      { label: 'Clear filters', filter: undefined as string | undefined },
      { label: 'New', filter: 'conditionIds:{1000}' },
      { label: 'Used', filter: 'conditions:{USED}' },
      { label: 'Auction', filter: 'buyingOptions:{AUCTION}' },
      { label: 'Buy It Now', filter: 'buyingOptions:{FIXED_PRICE}' },
    ],
    []
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
          <Text style={[styles.brandMark, { color: colors.text }]} numberOfLines={1}>
            DealHub
          </Text>
          <View style={styles.topBarRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Available credit, load more on Account"
              hitSlop={6}
              onPress={goAccountToLoadCredit}
              style={({ pressed }) => [
                styles.creditBar,
                {
                  backgroundColor: colors.banner,
                  borderColor: colors.border,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <Text style={[styles.creditLabel, { color: colors.muted }]}>Available credit</Text>
              <Text style={[styles.creditValue, { color: colors.accent }]}>
                {hydrated ? `$${storeCredit.toFixed(2)}` : '...'}
              </Text>
            </Pressable>
            <Pressable hitSlop={8} style={styles.iconBtn} onPress={() => setWheelOpen(true)}>
              <SpinningWheelIcon size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.searchRow, { paddingHorizontal: H_PAD }]}>
          <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="search" size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              value={feedQueryText}
              onChangeText={setFeedQueryText}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </View>
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
            <View style={styles.dropdownTriggerMain}>
              <Text style={styles.dropdownTriggerEmoji}>{categoryTrigger.emoji}</Text>
              <Text style={[styles.dropdownTriggerText, { color: colors.text }]} numberOfLines={1}>
                {categoryTrigger.label}
              </Text>
            </View>
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
            {feedCategorySlug !== 'all' ? ` · ${categoryTrigger.label}` : ''}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterStrip, { paddingHorizontal: H_PAD }]}>
          {quickBrowseFilters.map((chip) => {
            const active = chip.filter != null && browseFilter === chip.filter;
            return (
              <Pressable
                key={chip.label}
                onPress={() => setBrowseFilter(chip.filter)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#fff' : colors.text },
                  ]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
          {(lastRefinement?.conditionDistributions ?? []).slice(0, 8).map((row, i) => {
            if (!row.refinementHref || !row.condition) return null;
            return (
              <Pressable
                key={`cond-${row.conditionId ?? i}`}
                onPress={() => applyRefinementHref(row.refinementHref!)}
                style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
                  {row.condition}
                </Text>
              </Pressable>
            );
          })}
          {(lastRefinement?.buyingOptionDistributions ?? []).slice(0, 4).map((row, i) => {
            if (!row.refinementHref || !row.buyingOption) return null;
            return (
              <Pressable
                key={`buy-${row.buyingOption}-${i}`}
                onPress={() => applyRefinementHref(row.refinementHref!)}
                style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
                  {row.buyingOption.replace(/_/g, ' ')}
                </Text>
              </Pressable>
            );
          })}
          {(lastRefinement?.categoryDistributions ?? []).slice(0, 10).map((row, i) => {
            if (!row.refinementHref || !row.categoryName) return null;
            return (
              <Pressable
                key={`cat-${row.categoryId ?? i}`}
                onPress={() => applyRefinementHref(row.refinementHref!)}
                style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
                  {row.categoryName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [
    scheme,
    hydrated,
    storeCredit,
    categoryTrigger,
    dealCountLabel,
    feedCategorySlug,
    categoriesError,
    feedError,
    feedQueryText,
    browseFilter,
    lastRefinement,
    quickBrowseFilters,
    setBrowseFilter,
    applyRefinementHref,
    setFeedQueryText,
    goAccountToLoadCredit,
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
        refreshing={false}
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
              {feedError ? (
                <Text style={[styles.feedLoadingText, { color: c.price, marginTop: 10 }]}>{feedError}</Text>
              ) : null}
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
      <CreditPrizeWheelModal visible={wheelOpen} onClose={closePrizeWheel} onGoAddCredit={goAccountFromWheel} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandMark: { flexShrink: 0, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  creditBar: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  creditLabel: { fontSize: 11, fontWeight: '600' },
  creditValue: { fontSize: 17, fontWeight: '900', marginTop: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionHead: { marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: 4 },
  filterStrip: { gap: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dropdownTriggerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 8,
    gap: 10,
  },
  dropdownTriggerEmoji: { fontSize: 22, lineHeight: 26 },
  dropdownTriggerText: { flex: 1, fontSize: 16, fontWeight: '600', minWidth: 0 },
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
