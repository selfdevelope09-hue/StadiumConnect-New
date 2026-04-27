import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import type { AuthStackParamList } from '@/navigation/types';
import { signInWithEmail } from '@/services/authService';
import { signInToFirebaseWithGoogleIdToken } from '@/services/googleAuthExpo';

WebBrowser.maybeCompleteAuthSession();

const primary = brand.primary;

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'UserLogin'>;

export function LoginScreen({ navigation }: { navigation: Nav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    webClientId
      ? { clientId: webClientId, iosClientId: iosClientId || undefined }
      : { clientId: 'placeholder.apps.googleusercontent.com' }
  );

  const handleIdToken = useCallback(async (idToken: string) => {
    setError(null);
    setGoogleBusy(true);
    const { error: ge } = await signInToFirebaseWithGoogleIdToken(idToken);
    if (ge) {
      setError(ge.message);
    }
    setGoogleBusy(false);
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      void handleIdToken(String(response.params.id_token));
    }
  }, [response, handleIdToken]);

  const onEmailLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: e } = await signInWithEmail(email, password);
    setLoading(false);
    if (e) {
      setError('Invalid email or password.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 48, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          variant="headlineSmall"
          style={{ fontWeight: '700', marginBottom: 4 }}
        >
          Welcome back
        </Text>
        <Text style={{ color: '#4f6f8d', marginBottom: 20 }}>Sign in to continue</Text>
        {error ? (
          <HelperText type="error" style={{ marginBottom: 8 }}>
            {error}
          </HelperText>
        ) : null}
        {webClientId ? (
          <Button
            mode="outlined"
            onPress={() => {
              if (request) {
                void promptAsync();
              }
            }}
            style={{ marginBottom: 12 }}
            disabled={!request || loading || googleBusy}
            loading={googleBusy}
            textColor={primary}
          >
            Continue with Google
          </Button>
        ) : null}
        {webClientId ? (
          <Text style={{ textAlign: 'center', color: '#999' }}>or</Text>
        ) : null}
        <View style={{ height: 12 }} />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ marginBottom: 8 }}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 12 }}
        />
        <Button
          mode="contained"
          onPress={onEmailLogin}
          loading={loading}
          disabled={googleBusy}
          buttonColor={primary}
        >
          Sign in
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('UserRegister')}
          textColor={primary}
          style={{ marginTop: 8 }}
        >
          Create an account
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          textColor={primary}
        >
          Back
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
