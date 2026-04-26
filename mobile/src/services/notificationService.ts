import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';

import { auth, db, functions } from '@/config/firebase';

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VENDOR_ACCEPTED'
  | 'VENDOR_REJECTED'
  | 'NEW_BOOKING_REQUEST'
  | 'REVIEW_RECEIVED'
  | 'PAYOUT_PROCESSED'
  | 'PROMOTIONAL';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getTokenFromEnv(): string | null {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    : null;
}

/**
 * Call once on app start (e.g. after user signs in). Saves Expo push token to
 * `users/{uid}`. EAS: set `extra.eas.projectId` in app.config for production tokens.
 */
export async function setupNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!Device.isDevice) {
    return null;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return null;
  }
  const projectId =
    getTokenFromEnv() ||
    (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | null)?.extra
      ?.eas?.projectId;
  const token = (
    await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    )
  ).data;
  const u = auth.currentUser;
  if (u) {
    await setDoc(
      doc(db, 'users', u.uid),
      { expoPushToken: token, tokenUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  return token;
}

export async function sendServerNotification(
  toUserId: string,
  type: NotificationType,
  data: Record<string, unknown>
): Promise<void> {
  const send = httpsCallable<
    { toUserId: string; type: string; data: Record<string, unknown> },
    { ok?: boolean }
  >(functions, 'sendPushNotification');
  try {
    await send({ toUserId, type, data });
  } catch {
    // Cloud Function not deployed yet
  }
}

export async function scheduleLocal(
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (Platform.OS === 'web') {
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: null,
  });
}
