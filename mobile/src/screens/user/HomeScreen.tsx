import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { brand } from '@/config/appTheme';
import type { UserStackParamList, UserTabParamList } from '@/navigation/types';

const primary = brand.primary;

type TabNav = BottomTabNavigationProp<UserTabParamList, 'HomeTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const open = (screen: keyof UserStackParamList) => {
    navigation.getParent()?.navigate(screen as never);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      <Animated.View entering={FadeIn.duration(450)}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', marginBottom: 8 }}>
          Stadium<Text style={{ color: primary }}>Connect</Text>
        </Text>
        <Text style={{ color: '#666', marginBottom: 20, lineHeight: 22 }}>
          Premium event marketplace — find a venue, lock a date, and book trusted
          vendors.
        </Text>
        <Card
          mode="contained"
          style={{ marginBottom: 12, backgroundColor: '#fff5f0' }}
        >
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
              Book a stadium
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: 12, color: '#555' }}>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            mode="contained"
            buttonColor={primary}
            onPress={() => open('HomeHtml')}
            style={{ marginBottom: 4 }}
            icon="robot-outline"
          >
            Home (HTML) + AI
          </Button>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
