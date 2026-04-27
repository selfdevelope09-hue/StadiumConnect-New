import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import type { UserStackParamList, UserTabParamList } from '@/navigation/types';

const primary = brand.primary;

type TabNav = BottomTabNavigationProp<UserTabParamList, 'ExploreTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const open = (screen: keyof UserStackParamList) => {
    navigation.getParent()?.navigate(screen as never);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text variant="titleLarge" style={styles.title}>
        Explore
      </Text>
      <Text style={styles.sectionNote}>Choose what you want to browse first.</Text>
      <View style={styles.grid2}>
        <Card style={styles.card} onPress={() => open('Vendors')}>
          <Card.Title title="Vendors" subtitle="city-wise providers" />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.body}>
              Find and compare service providers.
            </Text>
            <View style={styles.btnWrap}>
              <Button mode="contained" buttonColor={primary} onPress={() => open('Vendors')}>
                Open vendors
              </Button>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.card} onPress={() => open('Vendors')}>
          <Card.Title title="Packages" subtitle="multi-vendor combos" />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.body}>
              Explore curated event bundles by budget.
            </Text>
            <View style={styles.btnWrap}>
              <Button mode="contained" buttonColor={primary} onPress={() => open('Vendors')}>
                Open packages
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
      <Card style={styles.singleCard} onPress={() => open('Directory')}>
        <Card.Title title="Directory" subtitle="venues and cities" />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.body}>Browse venues and cities.</Text>
          <View style={styles.btnWrap}>
            <Button mode="contained" buttonColor={primary} onPress={() => open('Directory')}>
              Open directory
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, backgroundColor: '#ffffff' },
  title: { fontWeight: '800', marginBottom: 6, color: '#0e2a47' },
  sectionNote: { color: '#5f7d99', marginBottom: 12 },
  grid2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#eef6ff' },
  singleCard: { backgroundColor: '#f5faff' },
  body: { color: '#4f6f8d' },
  btnWrap: { marginTop: 12 },
});
