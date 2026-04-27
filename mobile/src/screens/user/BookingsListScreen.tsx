import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import type { UserStackParamList, UserTabParamList } from '@/navigation/types';

const primary = brand.primary;

type TabNav = BottomTabNavigationProp<UserTabParamList, 'BookingsTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

export function BookingsListScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <View style={{ padding: 20 }}>
      <Text variant="bodyLarge" style={{ marginBottom: 16, color: '#555' }}>
        Your reservations will appear here (same data as bookings.html + Firestore
        collections).
      </Text>
      <Button
        mode="contained"
        buttonColor={primary}
        onPress={() => navigation.getParent()?.navigate('Bookings' as never)}
      >
        Open full booking list
      </Button>
      <Button
        mode="contained-tonal"
        onPress={() => navigation.getParent()?.navigate('BookingTracking' as never)}
        textColor={primary}
        style={{ marginTop: 8 }}
      >
        Payment center (due + receipt)
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.getParent()?.navigate('BookingAnalytics' as never)}
        textColor={primary}
        style={{ marginTop: 8 }}
      >
        Booking analytics
      </Button>
    </View>
  );
}
