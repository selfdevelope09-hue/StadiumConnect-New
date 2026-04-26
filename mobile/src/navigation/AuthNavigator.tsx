import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LandingScreen } from '@/screens/auth/LandingScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { RoleLoginScreen } from '@/screens/auth/RoleLoginScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerTitle: 'StadiumConnect',
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="UserLogin" component={LoginScreen} options={{ title: 'Sign in' }} />
      <Stack.Screen
        name="UserRegister"
        component={RegisterScreen}
        options={{ title: 'Register' }}
      />
      <Stack.Screen
        name="RoleLogin"
        component={RoleLoginScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
