import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCatalog } from '@/context/CatalogContext';
import { useCart } from '@/context/CartContext';
import { getProductImageCaption, getProductImageUrl, type Product } from '@/data/products';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { width } = useWindowDimensions();
  const { addToCart } = useCart();
  const { ensureProductLoaded } = useCatalog();
  const [qty, setQty] = useState(1);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(undefined);
      setLoading(false);
      return;
    }
    const raw = String(id);
    const sid = (() => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })();
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const p = await ensureProductLoaded(sid);
      if (cancelled) return;
      setProduct(p);
      setLoadError(p ? null : 'Product not found.');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, ensureProductLoaded]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: 'Product' }} />
        <ActivityIndicator size="large" color={c.accent} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={{ color: c.text }}>{loadError ?? 'Product not found.'}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: c.accent, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Product', headerBackTitle: 'Back' }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: getProductImageUrl(product) }}
          style={{ width, height: width, backgroundColor: '#E5E7EB' }}
          accessibilityLabel={getProductImageCaption(product)}
        />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          {product.tag ? (
            <View style={[styles.tag, { backgroundColor: c.accent }]}>
              <Text style={styles.tagText}>{product.tag}</Text>
            </View>
          ) : null}
          <Text style={[styles.title, { color: c.text }]}>{product.title}</Text>
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={14} color="#FBBF24" />
            <Text style={[styles.ratingText, { color: c.muted }]}>
              {product.rating.toFixed(1)} · {product.reviewCount.toLocaleString()} reviews
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: c.price }]}>${product.price.toFixed(2)}</Text>
            {product.compareAtPrice != null ? (
              <Text style={[styles.strike, { color: c.priceStrike }]}>
                ${product.compareAtPrice.toFixed(2)}
              </Text>
            ) : null}
          </View>
          {product.description ? (
            <Text style={[styles.desc, { color: c.text }]}>{product.description}</Text>
          ) : null}
          <Text style={[styles.blurb, { color: c.muted }]}>
            Free returns within 30 days. Ships from DealHub fulfillment. Estimated delivery: 4–7
            business days.
          </Text>
          <View style={styles.qtySection}>
            <Text style={[styles.qtyLabel, { color: c.text }]}>Quantity</Text>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                style={[styles.qtyBtn, { borderColor: c.border }]}>
                <FontAwesome name="minus" size={14} color={c.text} />
              </Pressable>
              <Text style={[styles.qtyVal, { color: c.text }]}>{qty}</Text>
              <Pressable
                onPress={() => setQty((q) => q + 1)}
                style={[styles.qtyBtn, { borderColor: c.border }]}>
                <FontAwesome name="plus" size={14} color={c.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.bar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable
          onPress={() => {
            addToCart(product.id, qty);
            router.push('/(tabs)/cart');
          }}
          style={[styles.addBtn, { backgroundColor: c.accent }]}>
          <Text style={styles.addBtnText}>Add to cart</Text>
        </Pressable>
        <Pressable
          style={[styles.buyBtn, { borderColor: c.accent }]}
          onPress={() => addToCart(product.id, qty)}>
          <Text style={[styles.buyBtnText, { color: c.accent }]}>Buy now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { padding: 16, paddingBottom: 24 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 10 },
  tagText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ratingText: { fontSize: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 14 },
  price: { fontSize: 28, fontWeight: '900' },
  strike: { fontSize: 16, textDecorationLine: 'line-through' },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 14 },
  blurb: { fontSize: 14, lineHeight: 20, marginTop: 16 },
  qtySection: { marginTop: 20 },
  qtyLabel: { fontWeight: '700', marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  buyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: { fontWeight: '800', fontSize: 16 },
});
