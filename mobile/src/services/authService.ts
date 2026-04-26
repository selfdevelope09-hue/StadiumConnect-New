import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth } from '@/config/firebase';
import type { AppRole } from '@/types/roles';

import { ensureUserProfile, fetchUserRole } from './firestoreService';

export type AuthError = { code: string; message: string };

function mapErr(e: unknown): AuthError {
  if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
    return {
      code: String((e as { code: string }).code),
      message: String((e as { message: string }).message),
    };
  }
  return { code: 'unknown', message: 'Something went wrong' };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: AuthError | null }> {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    return { error: null };
  } catch (e) {
    return { error: mapErr(e) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ error: AuthError | null }> {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    await ensureUserProfile(
      user.uid,
      user.email,
      user.displayName ?? displayName
    );
    return { error: null };
  } catch (e) {
    return { error: mapErr(e) };
  }
}

export async function signOutUser(): Promise<{ error: AuthError | null }> {
  try {
    await signOut(auth);
    return { error: null };
  } catch (e) {
    return { error: mapErr(e) };
  }
}

/**
 * Use after sign-in on role-specific entry screens. Signs out and returns `ok: false` if Firestore `role` does not match.
 */
export async function assertSignedInUserRole(
  expected: AppRole
): Promise<{ ok: true; role: AppRole } | { ok: false; role: AppRole }> {
  const u = auth.currentUser;
  if (!u) {
    return { ok: false, role: 'user' };
  }
  const role = await fetchUserRole(u.uid);
  if (role !== expected) {
    await signOut(auth);
    return { ok: false, role };
  }
  return { ok: true, role };
}
