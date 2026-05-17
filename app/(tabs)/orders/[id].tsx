import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderDetailContent } from '@/components/OrderDetailContent';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useOrders } from '@/context/OrdersContext';
import { useDeliveryClock } from '@/hooks/useDeliveryClock';
import { isDeliveredByExpectedAt } from '@/lib/expectedDelivery';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { hydrated, orders } = useOrders();
  const now = useDeliveryClock(30_000);

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);
  const delivered = order ? isDeliveredByExpectedAt(order.expectedDeliveryAt, now) : false;

  if (!hydrated) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={{ color: c.muted }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={[styles.miss, { color: c.text }]}>Order not found.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.link, { color: c.accent }]}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['bottom']}>
      <OrderDetailContent order={order} scheme={scheme} delivered={delivered} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  miss: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 16, fontWeight: '700' },
});
