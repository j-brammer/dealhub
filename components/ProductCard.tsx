import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { type Product, getProductImageCaption, getProductImageUrl } from '@/data/products';
import { useColorScheme } from '@/components/useColorScheme';

const GAP = 10;

type Props = {
  product: Product;
};

/** Use inside a parent with fixed column width (e.g. 2-col FlatList cell). */
export function ProductCard({ product }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Link
      href={{ pathname: '/product/[id]', params: { id: encodeURIComponent(product.id) } }}
      asChild>
      <Pressable
        style={({ pressed }) => [
          styles.wrap,
          {
            width: '100%',
            backgroundColor: c.card,
            borderColor: c.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}>
        <View style={styles.imageBox}>
          <Image
            source={{ uri: getProductImageUrl(product) }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={getProductImageCaption(product)}
          />
          {product.tag ? (
            <View style={[styles.tag, { backgroundColor: c.accent }]}>
              <Text style={styles.tagText}>{product.tag}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={10} color="#FBBF24" />
            <Text style={[styles.ratingText, { color: c.muted }]}>
              {product.rating.toFixed(1)} ({product.reviewCount > 999 ? `${(product.reviewCount / 1000).toFixed(1)}k` : product.reviewCount})
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
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: GAP,
    overflow: 'hidden',
  },
  /** ~3:2 landscape thumb — shorter than a full square so the card feels smaller. */
  imageBox: {
    aspectRatio: 3 / 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    minHeight: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
  },
  strike: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
});
