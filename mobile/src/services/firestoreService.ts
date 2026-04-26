import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { parseRole, type AppRole } from '@/types/roles';

const USERS = 'users';

export async function fetchUserRole(uid: string): Promise<AppRole> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) {
    return 'user';
  }
  return parseRole(snap.data()?.role);
}

/**
 * Create or merge a profile document so role-based routing can work on next launch.
 */
export async function ensureUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return;
  }
  await setDoc(ref, {
    email: email ?? null,
    displayName: displayName ?? null,
    role: 'user',
    createdAt: new Date().toISOString(),
  });
}
