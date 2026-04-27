import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { List, Text } from 'react-native-paper';

import type { UserStackParamList, UserTabParamList } from '@/navigation/types';
import { signOutUser } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

type TabNav = BottomTabNavigationProp<UserTabParamList, 'ProfileTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

const accountItems: { title: string; screen: keyof UserStackParamList }[] = [
  { title: 'Profile', screen: 'Profile' },
  { title: 'Notifications', screen: 'Notifications' },
  { title: 'Wishlist', screen: 'Wishlist' },
  { title: 'Analytics', screen: 'Analytics' },
];

const bookingItems: { title: string; screen: keyof UserStackParamList }[] = [
  { title: 'Payments & Remaining Due', screen: 'BookingTracking' },
  { title: 'Booking list', screen: 'Bookings' },
  { title: 'Booking analytics', screen: 'BookingAnalytics' },
];

export function MenuProfileScreen() {
  const navigation = useNavigation<Nav>();
  const name = useAuthStore((s) => s.user?.displayName) ?? 'Guest';
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);

  const onLogout = async () => {
    setBusy(true);
    await signOutUser();
    setBusy(false);
  };

  const openExternal = async (url: string) => {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ScrollView>
      <List.Section>
        <List.Subheader>
          {name} — signed in
        </List.Subheader>
        {accountItems.map((it) => (
          <List.Item
            key={it.title}
            title={it.title}
            onPress={() => navigation.getParent()?.navigate(it.screen as never)}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
          />
        ))}
        <List.Accordion
          title="Bookings & Payments"
          description="Track due, pay and receipts"
          expanded
          id="bookings-payments"
          left={(p) => <List.Icon {...p} icon="credit-card-outline" />}
        >
          {bookingItems.map((it) => (
            <List.Item
              key={it.title}
              title={it.title}
              onPress={() => navigation.getParent()?.navigate(it.screen as never)}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
            />
          ))}
        </List.Accordion>
        <List.Accordion
          title="Help Centre"
          description="Customer support and issue help"
          expanded={helpOpen}
          onPress={() => setHelpOpen((v) => !v)}
          id="help-center"
          left={(p) => <List.Icon {...p} icon="lifebuoy" />}
        >
          <List.Item
            title="Email support"
            description="stadiumconnect9@gmail.com"
            onPress={() => void openExternal('mailto:stadiumconnect9@gmail.com')}
            right={(p) => <List.Icon {...p} icon="email-outline" />}
          />
          <List.Item
            title="Call support"
            description="+91 7972343530"
            onPress={() => void openExternal('tel:+917972343530')}
            right={(p) => <List.Icon {...p} icon="phone-outline" />}
          />
          <List.Item
            title="WhatsApp support"
            description="Chat with support team"
            onPress={() => void openExternal('https://wa.me/917972343530')}
            right={(p) => <List.Icon {...p} icon="whatsapp" />}
          />
          <List.Item
            title="Open support page"
            description="FAQs and issue submission"
            onPress={() => navigation.getParent()?.navigate('Support' as never)}
            right={(p) => <List.Icon {...p} icon="open-in-new" />}
          />
          <Text style={{ paddingHorizontal: 16, paddingBottom: 12, color: '#666', fontSize: 12 }}>
            Support hours: 10:00 AM - 8:00 PM IST. Response in 2-6 hours.
          </Text>
        </List.Accordion>
        <List.Item
          title="Sign out"
          onPress={onLogout}
          disabled={busy}
          left={(p) => <List.Icon {...p} icon="logout" />}
        />
      </List.Section>
    </ScrollView>
  );
}
