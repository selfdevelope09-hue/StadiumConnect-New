import { useState } from 'react';
import { Appbar } from 'react-native-paper';

import { signOutUser } from '@/services/authService';

export function SignOutAction() {
  const [busy, setBusy] = useState(false);
  return (
    <Appbar.Action
      icon="logout"
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        await signOutUser();
        setBusy(false);
      }}
    />
  );
}
