import type { User } from 'firebase/auth';
import { create } from 'zustand';

import type { AppRole } from '@/types/roles';
import { parseRole } from '@/types/roles';

type AuthState = {
  user: User | null;
  role: AppRole;
  authReady: boolean;
  setUser: (u: User | null) => void;
  setRole: (r: AppRole) => void;
  setAuthReady: (v: boolean) => void;
  hydrateRole: (r: unknown) => void;
  reset: () => void;
};

const initial = {
  user: null as User | null,
  role: 'user' as AppRole,
  authReady: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setUser: (u) => set({ user: u }),
  setRole: (r) => set({ role: r }),
  setAuthReady: (v) => set({ authReady: v }),
  hydrateRole: (r) => set({ role: parseRole(r) }),
  reset: () => set({ ...initial, authReady: true }),
}));
