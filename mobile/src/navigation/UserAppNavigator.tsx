import { useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AIChatModal } from '@/components/ai/AIChatModal';
import { FloatingChatButton } from '@/components/ai/FloatingChatButton';
import { WebMigratedScreen } from '@/components/WebMigratedScreen';
import { UserTabNavigator } from '@/navigation/UserTabNavigator';
import { BookingConfirmedScreen } from '@/screens/user/BookingConfirmedScreen';
import { PaymentScreen } from '@/screens/user/PaymentScreen';
import { NotificationsScreen } from '@/screens/user/NotificationsScreen';

import type { UserStackParamList } from './types';

const Stack = createNativeStackNavigator<UserStackParamList>();

const stackScreens: (keyof UserStackParamList)[] = [
  'StadiumBooking',
  'StadiumBooking3D',
  'StadiumManagement',
  'Directory',
  'Vendors',
  'VendorDetail',
  'VendorCompare',
  'VendorManagement',
  'BookingForm',
  'Bookings',
  'BookingAnalytics',
  'Wishlist',
  'Support',
  'Profile',
  'Analytics',
  'EventPlanner',
  'AgentManagement',
  'Dashboard',
  'MigratedFromWeb',
  'HomeHtml',
];

export function UserAppNavigator() {
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator>
        <Stack.Screen
          name="UserTabs"
          component={UserTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Checkout', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="BookingConfirmed"
          component={BookingConfirmedScreen}
          options={{ title: 'Booking confirmed', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications', headerBackTitle: 'Back' }}
        />
        {stackScreens.map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            component={WebMigratedScreen}
            options={
              name === 'MigratedFromWeb'
                ? { title: 'Page' }
                : { title: String(name) }
            }
          />
        ))}
      </Stack.Navigator>
      <FloatingChatButton onPress={() => setAiOpen(true)} />
      <AIChatModal visible={aiOpen} onClose={() => setAiOpen(false)} />
    </View>
  );
}
