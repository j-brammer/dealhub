import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { SavedOrder } from '@/context/OrdersContext';
import { useOrders } from '@/context/OrdersContext';
import { useDeliveryClock } from '@/hooks/useDeliveryClock';
import { isDeliveredByExpectedAt } from '@/lib/expectedDelivery';

function orderRowTitle(lines: SavedOrder['lines']): string {
  if (lines.length === 0) return 'Order';
  if (lines.length === 1) return lines[0].title;
  return `${lines[0].title} +${lines.length - 1} more`;
}

export default function OrdersScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { hydrated, orders } = useOrders();
  const now = useDeliveryClock(30_000);

  const sorted = useMemo(() => [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [orders]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
        <Text style={[styles.title, { color: c.text }]}>Your orders</Text>
      </View>
      {!hydrated ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="cube" size={40} color={c.muted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No orders yet</Text>
          <Text style={[styles.emptySub, { color: c.muted }]}>Complete checkout and your orders will show up here.</Text>
          <Pressable
            onPress={() => router.push('/')}
            style={[styles.shopBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.shopBtnText}>Start shopping</Text>
            <FontAwesome name="arrow-right" size={14} color="#fff" style={styles.shopBtnIcon} />
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sorted.map((o) => {
            const delivered = isDeliveredByExpectedAt(o.expectedDeliveryAt, now);
            return (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/orders/${o.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.92 : 1 },
                ]}>
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={3}>
                    {orderRowTitle(o.lines)}
                  </Text>
                  {delivered ? (
                    <View style={[styles.pill, { backgroundColor: c.deliveredBadge }]}>
                      <Text style={[styles.pillText, { color: c.deliveredBadgeText }]}>Delivered</Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, { backgroundColor: c.background }]}>
                      <Text style={[styles.pillTextMuted, { color: c.muted }]}>On the way</Text>
                    </View>
                  )}
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowTotal, { color: c.text }]}>${o.total.toFixed(2)}</Text>
                  <FontAwesome name="chevron-right" size={14} color={c.muted} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  shopBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 12,
  },
  shopBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  shopBtnIcon: { marginLeft: 2 },
  list: { padding: 16, paddingBottom: 32, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  rowTotal: { fontSize: 17, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 11, fontWeight: '800' },
  pillTextMuted: { fontSize: 11, fontWeight: '700' },
});
