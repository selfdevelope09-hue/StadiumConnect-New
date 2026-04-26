import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { firebaseConfig } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

type FirebaseAuthRNPersistence = (storage: unknown) => unknown;

/**
 * Web .d.ts for `firebase/auth` omit `getReactNativePersistence`; the Expo/Metro
 * bundle still provides it. Keep AsyncStorage here for Play-Store-grade sessions.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: FirebaseAuthRNPersistence;
};

function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export { app };
