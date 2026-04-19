import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCatalog } from '@/context/CatalogContext';

export default function CategoriesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { categories, categoriesLoading, categoriesError } = useCatalog();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
        <Text style={[styles.title, { color: c.text }]}>Categories</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Browse by lane (eBay listings)</Text>
      </View>
      {categoriesError ? (
        <Text style={[styles.err, { color: c.price, paddingHorizontal: 16 }]}>{categoriesError}</Text>
      ) : null}
      {categoriesLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {categories.map((cat) => (
            <Link key={cat.id} href={{ pathname: '/category/[id]', params: { id: cat.slug } }} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
                ]}>
                <Text style={styles.emoji}>{cat.emoji}</Text>
                <Text style={[styles.label, { color: c.text }]}>{cat.label}</Text>
                <FontAwesome name="chevron-right" size={14} color={c.muted} style={styles.chevron} />
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 6 },
  err: { fontSize: 14, marginBottom: 8 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48 },
  grid: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emoji: { fontSize: 28, marginRight: 14 },
  label: { flex: 1, fontSize: 17, fontWeight: '700' },
  chevron: { marginLeft: 8 },
});
