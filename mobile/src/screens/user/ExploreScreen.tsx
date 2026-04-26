import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, View } from 'react-native';
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
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: 12 }}>
        Explore
      </Text>
      <Card style={{ marginBottom: 12 }} onPress={() => open('Directory')}>
        <Card.Title title="Directory" subtitle="directory.html" />
        <Card.Content>
          <Text variant="bodyMedium">Browse venues and cities.</Text>
          <View style={{ marginTop: 12 }}>
            <Button mode="contained" buttonColor={primary} onPress={() => open('Directory')}>
              Open
            </Button>
          </View>
        </Card.Content>
      </Card>
      <Card onPress={() => open('Vendors')}>
        <Card.Title title="Vendors" subtitle="vendors.html" />
        <Card.Content>
          <Text variant="bodyMedium">Find and compare service providers.</Text>
          <View style={{ marginTop: 12 }}>
            <Button mode="contained" buttonColor={primary} onPress={() => open('Vendors')}>
              Open
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
