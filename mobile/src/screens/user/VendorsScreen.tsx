import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/config/appTheme';
import type { UserStackParamList, UserTabParamList } from '@/navigation/types';

const ORANGE = brand.primary;
const ORANGE_2 = '#FF8C42';
const CATEGORIES = [
  { label: 'Decorators', icon: '🎨' },
  { label: 'Photographers', icon: '📸' },
  { label: 'Caterers', icon: '🍽️' },
  { label: 'Band Baja', icon: '🎵' },
  { label: 'Venue', icon: '🏛️' },
] as const;

type TabNav = BottomTabNavigationProp<UserTabParamList, 'ExploreTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

/**
 * Vendors hub with white + light-blue + orange investor-friendly theme.
 */
export function VendorsScreen() {
  const navigation = useNavigation<Nav>();
  const openVendors = () => navigation.getParent()?.navigate('Vendors' as never);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
    >
      <Text style={styles.h1}>
        Vendors
      </Text>
      <Text style={styles.sub}>
        Book decorators, photo, food & more — use the <Text style={styles.b}>🤖 AI</Text> button
        to get smart picks in your city.
      </Text>
      <View style={styles.grid}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.label}
            onPress={openVendors}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.emoji}>{c.icon}</Text>
            <Text style={styles.cardT}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 100 },
  h1: { fontSize: 26, fontWeight: '800', color: '#0e2a47' },
  sub: { color: '#4f6f8d', marginTop: 8, marginBottom: 20, lineHeight: 22 },
  b: { color: ORANGE, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    minWidth: 150,
    backgroundColor: '#eef6ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cfe7ff',
    shadowColor: ORANGE_2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  emoji: { fontSize: 28, marginBottom: 8 },
  cardT: { fontWeight: '700', color: '#0e2a47', fontSize: 15 },
});
