import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { MigratedContent } from '@/components/MigratedContent';
import { SignOutAction } from '@/components/SignOutAction';
import { VendorEarningsScreen } from '@/screens/vendor/VendorEarningsScreen';

const mk = (title: string, sourceHtml: string) =>
  function Screen() {
    return <MigratedContent title={title} sourceHtml={sourceHtml} />;
  };

const OwnerStack = createNativeStackNavigator();
const AgentStack = createNativeStackNavigator();
const DeveloperStack = createNativeStackNavigator();
const VendorStack = createNativeStackNavigator();
const DSuper = createDrawerNavigator();

const headerWithSignOut = { headerRight: () => <SignOutAction /> };

function VendorEarningsLink() {
  const n = useNavigation();
  return (
    <Pressable
      onPress={() => n.navigate('VendorEarnings' as never)}
      style={{ marginRight: 8 }}
    >
      <Text style={{ color: '#ff6b35', fontWeight: '600' }}>Earnings</Text>
    </Pressable>
  );
}

export function OwnerAppNavigator() {
  return (
    <OwnerStack.Navigator screenOptions={headerWithSignOut}>
      <OwnerStack.Screen
        name="OwnerDashboard"
        options={{ title: 'Owner' }}
        component={mk('Owner', 'owner-dashboard.html')}
      />
      <OwnerStack.Screen
        name="StadiumOwner"
        options={{ title: 'Stadiums' }}
        component={mk('Stadium management', 'stadium-management.html')}
      />
      <OwnerStack.Screen
        name="VendorsOwner"
        options={{ title: 'Vendors' }}
        component={mk('Vendor management', 'vendor-management.html')}
      />
    </OwnerStack.Navigator>
  );
}

export function AgentAppNavigator() {
  return (
    <AgentStack.Navigator screenOptions={headerWithSignOut}>
      <AgentStack.Screen
        name="AgentHome"
        options={{ title: 'Agent' }}
        component={mk('Agent', 'agent-dashboard.html')}
      />
      <AgentStack.Screen
        name="AgentManagement"
        options={{ title: 'Agent management' }}
        component={mk('Agent management', 'agent-management.html')}
      />
    </AgentStack.Navigator>
  );
}

export function DeveloperAppNavigator() {
  return (
    <DeveloperStack.Navigator screenOptions={headerWithSignOut}>
      <DeveloperStack.Screen
        name="DevPanel"
        options={{ title: 'Developer' }}
        component={mk('Developer', 'developer-panel.html')}
      />
    </DeveloperStack.Navigator>
  );
}

export function VendorAppNavigator() {
  return (
    <VendorStack.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {route.name === 'VendorDash' ? <VendorEarningsLink /> : null}
            <SignOutAction />
          </View>
        ),
      })}
    >
      <VendorStack.Screen
        name="VendorDash"
        options={{ title: 'Vendor' }}
        component={mk('Vendor', 'vendor-dashboard.html')}
      />
      <VendorStack.Screen
        name="VendorEarnings"
        options={{ title: 'Earnings' }}
        component={VendorEarningsScreen}
      />
    </VendorStack.Navigator>
  );
}

/**
 * super-admin.html plus quick links
 */
export function SuperAdminAppNavigator() {
  return (
    <DSuper.Navigator
      screenOptions={{
        drawerActiveTintColor: '#7c3aed',
        headerRight: () => <SignOutAction />,
        headerShown: true,
      }}
    >
      <DSuper.Screen
        name="SuperRoot"
        options={{ title: 'Super admin' }}
        component={mk('Super admin', 'super-admin.html')}
      />
      <DSuper.Screen
        name="SuperAnalytics"
        options={{ title: 'Analytics' }}
        component={mk('Analytics', 'analytics.html')}
      />
      <DSuper.Screen
        name="SuperVendors"
        options={{ title: 'Admin vendors' }}
        component={mk('Admin vendors', 'admin-vendors.html')}
      />
    </DSuper.Navigator>
  );
}
