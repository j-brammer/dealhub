import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { SavedOrder } from '@/context/OrdersContext';

type Scheme = 'light' | 'dark';

function formatPlacedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function OrderDetailContent({
  order: o,
  scheme,
  delivered,
}: {
  order: SavedOrder;
  scheme: Scheme;
  delivered: boolean;
}) {
  const c = Colors[scheme];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.date, { color: c.muted }]}>{formatPlacedAt(o.placedAt)}</Text>
          {delivered ? (
            <View style={[styles.badge, { backgroundColor: c.deliveredBadge }]}>
              <Text style={[styles.badgeText, { color: c.deliveredBadgeText }]}>Delivered</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: c.background }]}>
              <Text style={[styles.badgeTextMuted, { color: c.muted }]}>On the way</Text>
            </View>
          )}
        </View>
        {o.lines.map((ln, idx) => (
          <View key={`${o.id}-L${idx}`} style={styles.lineRow}>
            <Text style={[styles.lineTitle, { color: c.text }]} numberOfLines={4}>
              {ln.title}
            </Text>
            <Text style={[styles.lineMeta, { color: c.muted }]}>
              ${(ln.quantity * ln.unitPrice).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: c.muted }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: c.text }]}>${o.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: c.muted }]}>{o.shippingTitle}</Text>
          <Text style={[styles.summaryValue, { color: c.text }]}>
            {o.shippingFee > 0 ? `$${o.shippingFee.toFixed(2)}` : 'Free'}
          </Text>
        </View>
        {o.storeCreditApplied > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.muted }]}>Store credit</Text>
            <Text style={[styles.summaryValue, { color: c.price }]}>−${o.storeCreditApplied.toFixed(2)}</Text>
          </View>
        ) : null}
        {o.noteLines.length > 0 ? (
          <View style={styles.notes}>
            {o.noteLines.map((line, i) => (
              <Text key={`${o.id}-n-${i}`} style={[styles.noteLine, { color: c.muted }]}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={[styles.totalRow, { borderTopColor: c.border }]}>
          <Text style={[styles.totalLabel, { color: c.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: c.text }]}>${o.total.toFixed(2)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  date: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  badgeTextMuted: { fontSize: 12, fontWeight: '700' },
  lineRow: { gap: 2 },
  lineTitle: { fontSize: 15, fontWeight: '700' },
  lineMeta: { fontSize: 13, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  notes: { gap: 6, marginTop: 4 },
  noteLine: { fontSize: 12, lineHeight: 18 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 18, fontWeight: '800' },
});
