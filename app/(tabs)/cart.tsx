import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCart } from '@/context/CartContext';
import { useWallet } from '@/context/WalletContext';
import { getProductImageCaption, getProductImageUrl } from '@/data/products';

export default function CartScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { linesWithProduct, subtotal, setQuantity, removeLine } = useCart();
  const { storeCredit, deductStoreCredit } = useWallet();
  const appliedCredit = Math.min(storeCredit, subtotal);
  const totalDue = Math.max(0, subtotal - appliedCredit);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
        <Text style={[styles.title, { color: c.text }]}>Cart</Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          {linesWithProduct.length === 0 ? 'Your cart is empty' : `${linesWithProduct.length} item(s)`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {linesWithProduct.map(({ line, product }) => (
          <View
            key={line.productId}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <Image
              source={{ uri: getProductImageUrl(product) }}
              style={styles.thumb}
              accessibilityLabel={getProductImageCaption(product)}
            />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.rowPrice, { color: c.price }]}>${product.price.toFixed(2)}</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => setQuantity(line.productId, line.quantity - 1)}
                  style={[styles.qtyBtn, { borderColor: c.border }]}>
                  <FontAwesome name="minus" size={12} color={c.text} />
                </Pressable>
                <Text style={[styles.qty, { color: c.text }]}>{line.quantity}</Text>
                <Pressable
                  onPress={() => setQuantity(line.productId, line.quantity + 1)}
                  style={[styles.qtyBtn, { borderColor: c.border }]}>
                  <FontAwesome name="plus" size={12} color={c.text} />
                </Pressable>
                <Pressable onPress={() => removeLine(line.productId)} style={styles.remove}>
                  <Text style={{ color: c.muted, fontSize: 13 }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {linesWithProduct.length > 0 ? (
        <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.muted }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>${subtotal.toFixed(2)}</Text>
          </View>
          {storeCredit > 0 ? (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: c.muted }]}>Store credit</Text>
              <Text style={[styles.creditValue, { color: c.price }]}>
                −${appliedCredit.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.dueRow]}>
            <Text style={[styles.dueLabel, { color: c.text }]}>Total due</Text>
            <Text style={[styles.dueValue, { color: c.text }]}>${totalDue.toFixed(2)}</Text>
          </View>
          <Pressable
            style={[styles.checkout, { backgroundColor: c.accent }]}
            onPress={async () => {
              if (appliedCredit > 0) await deductStoreCredit(appliedCredit);
              Alert.alert(
                'Checkout (demo)',
                appliedCredit > 0
                  ? `Applied $${appliedCredit.toFixed(2)} store credit. This build does not process real payments.`
                  : 'This build does not process real payments.'
              );
            }}>
            <Text style={styles.checkoutText}>Proceed to checkout</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4 },
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumb: { width: 100, height: 100, backgroundColor: '#E5E7EB' },
  rowBody: { flex: 1, padding: 12, justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  rowPrice: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  remove: { marginLeft: 'auto' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 18, fontWeight: '800' },
  creditValue: { fontSize: 16, fontWeight: '800' },
  dueRow: { marginTop: 4, marginBottom: 4 },
  dueLabel: { fontSize: 16, fontWeight: '700' },
  dueValue: { fontSize: 20, fontWeight: '900' },
  checkout: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
