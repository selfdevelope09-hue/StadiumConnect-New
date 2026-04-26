import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

/**
 * Gemini key: set in `.env` as EXPO_PUBLIC_GEMINI_KEY=... (gitignored) or
 * in EAS / CI. Injected at build time into `expo-constants` `extra`.
 */
const config: ExpoConfig = {
  name: 'StadiumConnect',
  slug: 'stadiumconnect',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'stadiumconnect',
  // Native Razorpay module does not support New Architecture yet (Expo 54)
  newArchEnabled: false,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a2a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.stadiumconnect.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a2a',
    },
    package: 'com.stadiumconnect.app',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: true,
    // Expo Android option; types may lag SDK
    ...({ useNextNotificationsApi: true } as Record<string, unknown>),
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-web-browser',
    [
      'expo-notifications',
      {
        sounds: [],
        mode: 'production' as const,
      },
    ],
    'expo-image-picker',
    'expo-location',
  ],
  extra: {
    EXPO_PUBLIC_GEMINI_KEY: process.env.EXPO_PUBLIC_GEMINI_KEY ?? '',
    EXPO_PUBLIC_RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
  },
};

export default config;
