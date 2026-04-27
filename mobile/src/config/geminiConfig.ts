import Constants from 'expo-constants';

/**
 * ConnectAI backend: Google Generative API key (Expo still uses env name
 * `EXPO_PUBLIC_GEMINI_KEY`). Set in `.env` / EAS; never commit real keys.
 */
export function getGeminiApiKey(): string {
  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra === 'object' && 'EXPO_PUBLIC_GEMINI_KEY' in extra) {
    const v = (extra as Record<string, unknown>).EXPO_PUBLIC_GEMINI_KEY;
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return process.env.EXPO_PUBLIC_GEMINI_KEY?.trim() ?? '';
}

export const GEMINI_GENERATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
