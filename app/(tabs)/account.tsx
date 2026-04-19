import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function Row({
  icon,
  label,
  scheme,
}: {
  icon: ComponentProps<typeof FontAwesome>['name'];
  label: string;
  scheme: 'light' | 'dark';
}) {
  const c = Colors[scheme];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}>
      <FontAwesome name={icon} size={18} color={c.accent} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
      <FontAwesome name="chevron-right" size={14} color={c.muted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.banner }]}>
          <FontAwesome name="user" size={32} color={c.accent} />
        </View>
        <Text style={[styles.name, { color: c.text }]}>DealHub shopper</Text>
        <Text style={[styles.email, { color: c.muted }]}>Sign in to sync orders & lists</Text>
        <Pressable style={[styles.signIn, { backgroundColor: c.accent }]}>
          <Text style={styles.signInText}>Sign in</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        <Row icon="cube" label="Your orders" scheme={scheme} />
        <Row icon="heart-o" label="Saved items" scheme={scheme} />
        <Row icon="map-marker" label="Addresses" scheme={scheme} />
        <Row icon="credit-card" label="Payments" scheme={scheme} />
        <Row icon="life-ring" label="Help & support" scheme={scheme} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  signIn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowIcon: { width: 28 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});
