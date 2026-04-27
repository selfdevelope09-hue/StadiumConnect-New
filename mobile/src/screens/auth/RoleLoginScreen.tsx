import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { brand } from '@/config/appTheme';
import type { AppRole } from '@/types/roles';
import { assertSignedInUserRole, signInWithEmail } from '@/services/authService';
import type { AuthStackProps } from '@/navigation/types';

const primary = brand.primary;

const ROLE_COLOR: Record<AppRole, string> = {
  admin: '#667eea',
  superAdmin: '#7c3aed',
  owner: '#059669',
  agent: '#0ea5e9',
  developer: '#475569',
  vendor: '#c026d3',
  user: primary,
};

type Props = AuthStackProps<'RoleLogin'>;

/**
 * Firestore `users/{uid}.role` must match `route.params.role`.
 * Replace legacy static HTML "admin" passwords with this flow for production.
 */
export function RoleLoginScreen({ route, navigation }: Props) {
  const { role, title } = route.params;
  const accent = ROLE_COLOR[role] ?? primary;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: e } = await signInWithEmail(email, password);
    if (e) {
      setLoading(false);
      setError('Invalid email or password.');
      return;
    }
    const ok = await assertSignedInUserRole(role);
    setLoading(false);
    if (!ok.ok) {
      setError('This account is not allowed for this portal.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8f9fa' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={{ fontWeight: '800', color: accent }}>
          {title}
        </Text>
        <Text style={{ color: '#4f6f8d', marginTop: 4, marginBottom: 20 }}>
          Sign in with a Firebase user whose Firestore role is {role}.
        </Text>
        {error ? <HelperText type="error">{error}</HelperText> : null}
        <TextInput
          label="Work email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={{ marginBottom: 8, backgroundColor: '#fff' }}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 16, backgroundColor: '#fff' }}
        />
        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          buttonColor={accent}
        >
          Enter portal
        </Button>
        <View style={{ height: 12 }} />
        <Button mode="text" onPress={() => navigation.goBack()}>
          Back
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
