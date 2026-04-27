import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { brand } from '@/config/appTheme';
import { useOpenAIAssistant } from '@/context/AIAssistantContext';
import type { UserStackParamList, UserTabParamList } from '@/navigation/types';

const primary = brand.primary;

type TabNav = BottomTabNavigationProp<UserTabParamList, 'HomeTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { open: openAI } = useOpenAIAssistant();
  const open = (screen: keyof UserStackParamList) => {
    navigation.getParent()?.navigate(screen as never);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
    >
      <Animated.View entering={FadeIn.duration(450)}>
        <Text variant="headlineMedium" style={styles.title}>
          Stadium<Text style={{ color: primary }}>Connect</Text>
        </Text>
        <Text style={styles.subtitle}>
          Premium event marketplace — find a venue, lock a date, and book trusted
          vendors.
        </Text>
        <View style={styles.ctaWrap}>
          <Button
            mode="contained"
            buttonColor={primary}
            onPress={openAI}
            icon="robot-happy"
            contentStyle={styles.ctaContent}
          >
            Open ConnectAI (vendors, tips)
          </Button>
        </View>
        <Card
          mode="contained"
          style={styles.mainCard}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Book a stadium
            </Text>
            <Text variant="bodyMedium" style={styles.cardBody}>
              Same flow as stadium-booking.html — being ported to native lists,
              maps, and payments.
            </Text>
            <Button
              mode="contained"
              buttonColor={primary}
              onPress={() => open('StadiumBooking')}
            >
              Start booking
            </Button>
          </Card.Content>
        </Card>
        <View style={styles.twoCol}>
          <Card mode="contained" style={styles.dualCard}>
            <Card.Content>
              <Text style={styles.dualTitle}>Vendors</Text>
              <Text style={styles.dualSub}>Find trusted service partners by city.</Text>
              <Button mode="contained" buttonColor={primary} onPress={() => open('Vendors')}>
                Open vendors
              </Button>
            </Card.Content>
          </Card>
          <Card mode="contained" style={styles.dualCard}>
            <Card.Content>
              <Text style={styles.dualTitle}>Packages</Text>
              <Text style={styles.dualSub}>Curated multi-vendor event bundles.</Text>
              <Button mode="contained" buttonColor={primary} onPress={() => open('Vendors')}>
                View packages
              </Button>
            </Card.Content>
          </Card>
        </View>
        <View style={styles.rowButtons}>
          <Button
            mode="contained"
            buttonColor={primary}
            onPress={() => open('HomeHtml')}
            style={styles.smallBtn}
            icon="robot-outline"
          >
            Home (HTML) + AI
          </Button>
        </View>
        <View style={styles.rowButtons}>
          <Button mode="outlined" onPress={() => open('Directory')} textColor={primary}>
            Directory
          </Button>
          <Button mode="outlined" onPress={() => open('Vendors')} textColor={primary}>
            Vendors
          </Button>
          <Button mode="outlined" onPress={() => open('Dashboard')} textColor={primary}>
            Dashboard
          </Button>
          <Button mode="outlined" onPress={() => open('EventPlanner')} textColor={primary}>
            Event planner
          </Button>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 100, backgroundColor: '#ffffff' },
  title: { fontWeight: '800', marginBottom: 8, color: '#0e2a47' },
  subtitle: { color: '#4f6f8d', marginBottom: 12, lineHeight: 22 },
  ctaWrap: { marginBottom: 16 },
  ctaContent: { paddingVertical: 6 },
  mainCard: { marginBottom: 12, backgroundColor: '#eef6ff' },
  cardTitle: { fontWeight: '700', marginBottom: 8, color: '#0e2a47' },
  cardBody: { marginBottom: 12, color: '#4f6f8d' },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dualCard: { flex: 1, backgroundColor: '#f5faff' },
  dualTitle: { fontSize: 16, fontWeight: '800', color: '#0e2a47', marginBottom: 6 },
  dualSub: { fontSize: 12, color: '#5f7d99', marginBottom: 10, minHeight: 34 },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallBtn: { marginBottom: 4 },
});
