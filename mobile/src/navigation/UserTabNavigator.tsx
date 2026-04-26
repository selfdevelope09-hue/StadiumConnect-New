import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { NotificationBellButton } from '@/components/NotificationBellButton';
import { BookingsListScreen } from '@/screens/user/BookingsListScreen';
import { HomeScreen } from '@/screens/user/HomeScreen';
import { MenuProfileScreen } from '@/screens/user/MenuProfileScreen';
import { VendorsScreen } from '@/screens/user/VendorsScreen';

import type { UserTabParamList } from './types';

const Tab = createBottomTabNavigator<UserTabParamList>();

export function UserTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ff6b35',
        tabBarInactiveTintColor: '#888',
        headerTitle: 'StadiumConnect',
        headerRight: () => <NotificationBellButton />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={VendorsScreen}
        options={{
          title: 'Vendors',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsListScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={MenuProfileScreen}
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
