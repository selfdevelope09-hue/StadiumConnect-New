import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { List } from 'react-native-paper';

import type { UserStackParamList, UserTabParamList } from '@/navigation/types';
import { signOutUser } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

type TabNav = BottomTabNavigationProp<UserTabParamList, 'ProfileTab'>;
type RootNav = NativeStackNavigationProp<UserStackParamList>;
type Nav = CompositeNavigationProp<TabNav, RootNav>;

const items: { title: string; screen: keyof UserStackParamList }[] = [
  { title: 'Profile', screen: 'Profile' },
  { title: 'Notifications', screen: 'Notifications' },
  { title: 'Wishlist', screen: 'Wishlist' },
  { title: 'Support', screen: 'Support' },
  { title: 'Analytics', screen: 'Analytics' },
  { title: 'Payment (test)', screen: 'Payment' },
  { title: 'Agent management', screen: 'AgentManagement' },
  { title: 'Vendor management', screen: 'VendorManagement' },
  { title: 'Stadium management', screen: 'StadiumManagement' },
];

export function MenuProfileScreen() {
  const navigation = useNavigation<Nav>();
  const name = useAuthStore((s) => s.user?.displayName) ?? 'Guest';
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    await signOutUser();
    setBusy(false);
  };

  return (
    <ScrollView>
      <List.Section>
        <List.Subheader>
          {name} — signed in
        </List.Subheader>
        {items.map((it) => (
          <List.Item
            key={it.title}
            title={it.title}
            onPress={() => navigation.getParent()?.navigate(it.screen as never)}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
          />
        ))}
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
