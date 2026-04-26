import type { AuthStackProps } from '@/navigation/types';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import { signUpWithEmail } from '@/services/authService';
import { signInToFirebaseWithGoogleIdToken } from '@/services/googleAuthExpo';

WebBrowser.maybeCompleteAuthSession();

const primary = brand.primary;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function RegisterScreen({ navigation }: AuthStackProps<'UserRegister'>) {
  const [name, setName] = useState('');
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

  const onRegister = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error: e } = await signUpWithEmail(email, password, name.trim());
    setLoading(false);
    if (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 40, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: 4 }}>
          Create account
        </Text>
        <Text style={{ color: '#666', marginBottom: 20 }}>Join StadiumConnect</Text>
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
            disabled={!request || loading || googleBusy}
            loading={googleBusy}
            textColor={primary}
            style={{ marginBottom: 12 }}
          >
            Continue with Google
          </Button>
        ) : null}
        <TextInput
          label="Display name"
          value={name}
          onChangeText={setName}
          style={{ marginBottom: 8 }}
        />
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
          onPress={onRegister}
          loading={loading}
          buttonColor={primary}
          disabled={googleBusy}
        >
          Register
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          textColor={primary}
          style={{ marginTop: 8 }}
        >
          Back
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
