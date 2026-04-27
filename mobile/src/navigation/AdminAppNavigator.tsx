import { createDrawerNavigator } from '@react-navigation/drawer';

import { MigratedContent } from '@/components/MigratedContent';
import { SignOutAction } from '@/components/SignOutAction';
import { CommissionDashboard } from '@/screens/admin/CommissionDashboard';
import { PaymentVerificationScreen } from '@/screens/admin/PaymentVerificationScreen';

const Drawer = createDrawerNavigator();

const mk = (title: string, sourceHtml: string) =>
  function Screen() {
    return <MigratedContent title={title} sourceHtml={sourceHtml} />;
  };

/**
 * admin.html, admin-vendors.html, and related control surfaces
 */
export function AdminAppNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#ff7a1a',
        drawerType: 'front',
        headerRight: () => <SignOutAction />,
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        options={{ title: 'Dashboard', drawerLabel: 'Dashboard' }}
        component={mk('Admin', 'admin.html')}
      />
      <Drawer.Screen
        name="CommissionDashboard"
        options={{ title: 'Commissions & payouts' }}
        component={CommissionDashboard}
      />
      <Drawer.Screen
        name="PaymentVerification"
        options={{ title: 'Verify UPI payments' }}
        component={PaymentVerificationScreen}
      />
      <Drawer.Screen
        name="AdminVendors"
        options={{ title: 'Admin vendors' }}
        component={mk('Admin vendors', 'admin-vendors.html')}
      />
      <Drawer.Screen
        name="VendorManagementAdm"
        options={{ title: 'Vendor management' }}
        component={mk('Vendor management', 'vendor-management.html')}
      />
      <Drawer.Screen
        name="AgentManagementAdm"
        options={{ title: 'Agent management' }}
        component={mk('Agent management', 'agent-management.html')}
      />
      <Drawer.Screen
        name="AnalyticsAdm"
        options={{ title: 'Analytics' }}
        component={mk('Analytics', 'analytics.html')}
      />
      <Drawer.Screen
        name="StadiumManagementAdm"
        options={{ title: 'Stadium management' }}
        component={mk('Stadium management', 'stadium-management.html')}
      />
    </Drawer.Navigator>
  );
}
