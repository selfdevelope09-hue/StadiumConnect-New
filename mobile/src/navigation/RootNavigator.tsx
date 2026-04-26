import {
  DarkTheme as NavDarkBase,
  DefaultTheme as NavLightBase,
  NavigationContainer,
} from '@react-navigation/native';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { adaptNavigationTheme, PaperProvider } from 'react-native-paper';

import { makeDarkTheme, makeLightTheme } from '@/config/appTheme';
import { useAuthStore } from '@/store/authStore';

import { navigationRef } from './navigationRef';

import { AdminAppNavigator } from './AdminAppNavigator';
import { AuthNavigator } from './AuthNavigator';
import {
  AgentAppNavigator,
  DeveloperAppNavigator,
  OwnerAppNavigator,
  SuperAdminAppNavigator,
  VendorAppNavigator,
} from './OtherRoleNavigators';
import { UserAppNavigator } from './UserAppNavigator';

const paperLight = makeLightTheme();
const paperDark = makeDarkTheme();

const { LightTheme, DarkTheme: NavigationDark } = adaptNavigationTheme({
  reactNavigationLight: NavLightBase,
  reactNavigationDark: NavDarkBase,
  materialLight: paperLight,
  materialDark: paperDark,
});

function RoleApp() {
  const role = useAuthStore((s) => s.role);
  switch (role) {
    case 'admin':
      return <AdminAppNavigator />;
    case 'owner':
      return <OwnerAppNavigator />;
    case 'agent':
      return <AgentAppNavigator />;
    case 'developer':
      return <DeveloperAppNavigator />;
    case 'vendor':
      return <VendorAppNavigator />;
    case 'superAdmin':
      return <SuperAdminAppNavigator />;
    case 'user':
    default:
      return <UserAppNavigator />;
  }
}

export function RootNavigator() {
  const authReady = useAuthStore((s) => s.authReady);
  const user = useAuthStore((s) => s.user);
  const scheme = useColorScheme();
  const paper = scheme === 'dark' ? paperDark : paperLight;
  const navTheme = scheme === 'dark' ? NavigationDark! : LightTheme!;

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider theme={paper}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {user ? <RoleApp /> : <AuthNavigator />}
      </NavigationContainer>
    </PaperProvider>
  );
}
