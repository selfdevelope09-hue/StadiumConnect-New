import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, type ReactNode } from 'react';

import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/authStore';

import { fetchUserRole } from '@/services/firestoreService';
import { setupNotifications } from '@/services/notificationService';

type Props = { children: ReactNode };

/**
 * Subscribes to Firebase Auth and syncs the user's Firestore `role` into Zustand.
 */
export function FirebaseAuthListener({ children }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);
  const setRole = useAuthStore((s) => s.setRole);
  const first = useRef(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const role = await fetchUserRole(u.uid);
        setRole(role);
        void setupNotifications();
      } else {
        setRole('user');
      }
      if (first.current) {
        setAuthReady(true);
        first.current = false;
      }
    });
    return () => sub();
  }, [setAuthReady, setRole, setUser]);

  return <>{children}</>;
}
