import Constants from 'expo-constants';

/**
 * Key source: `app.config.ts` → `extra.EXPO_PUBLIC_GEMINI_KEY` (from env at build)
 * and/or Metro-inlined `process.env.EXPO_PUBLIC_GEMINI_KEY` from `.env`.
 * Set `EXPO_PUBLIC_GEMINI_KEY` in `.env` (see `.env.example`) or EAS secrets.
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
