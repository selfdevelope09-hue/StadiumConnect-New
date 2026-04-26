import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { ensureUserProfile } from './firestoreService';

export type GoogleAuthExpoError = { code: string; message: string };

/**
 * After obtaining an id_token from `expo-auth-session` (Google), link it to Firebase.
 * Configure OAuth client IDs in Google Cloud / Firebase, then set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in `.env` or EAS.
 */
export async function signInToFirebaseWithGoogleIdToken(
  idToken: string
): Promise<{ error: GoogleAuthExpoError | null }> {
  try {
    const cred = GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(auth, cred);
    await ensureUserProfile(
      user.uid,
      user.email,
      user.displayName ?? null
    );
    return { error: null };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return {
      error: {
        code: err.code ?? 'google-auth-failed',
        message: err.message ?? 'Google sign-in failed',
      },
    };
  }
}
