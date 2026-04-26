import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import type { AuthStackParamList } from '@/navigation/types';

const primary = brand.primary;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Landing'>;

export function LandingScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
      }}
    >
      <Text
        variant="headlineLarge"
        style={{ fontWeight: '800', textAlign: 'center', marginBottom: 8 }}
      >
        Stadium<Text style={{ color: primary }}>Connect</Text>
      </Text>
      <Text
        style={{
          textAlign: 'center',
          marginBottom: 32,
          color: '#666',
          lineHeight: 22,
        }}
      >
        Book stadiums, compare vendors, and run events—powered by the same
        Firebase project as your web app.
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('UserLogin')}
        style={{ marginBottom: 10 }}
        buttonColor={primary}
      >
        Sign in
      </Button>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('UserRegister')}
        textColor={primary}
        style={{ marginBottom: 10 }}
      >
        Create account
      </Button>
      <View style={{ height: 16 }} />
      <Text
        variant="labelSmall"
        style={{ textAlign: 'center', color: '#999', marginBottom: 8 }}
      >
        Staff & operators
      </Text>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', { role: 'admin', title: 'Admin portal' })
        }
        textColor={primary}
      >
        Admin
      </Button>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', { role: 'owner', title: 'Owner portal' })
        }
        textColor={primary}
      >
        Owner
      </Button>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', { role: 'agent', title: 'Agent portal' })
        }
        textColor={primary}
      >
        Agent
      </Button>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', {
            role: 'developer',
            title: 'Developer portal',
          })
        }
        textColor={primary}
      >
        Developer
      </Button>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', { role: 'vendor', title: 'Vendor portal' })
        }
        textColor={primary}
      >
        Vendor
      </Button>
      <Button
        mode="text"
        onPress={() =>
          navigation.navigate('RoleLogin', {
            role: 'superAdmin',
            title: 'Super admin',
          })
        }
        textColor={primary}
      >
        Super admin
      </Button>
    </View>
  );
}
