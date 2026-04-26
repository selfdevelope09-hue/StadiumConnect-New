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
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a2a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.stadiumconnect.app',
    infoPlist: {
      LSApplicationQueriesSchemes: [
        'phonepe',
        'tez',
        'paytmmp',
        'gpay',
        'upi',
        'paytm',
      ],
    },
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
    EXPO_PUBLIC_BUSINESS_UPI_ID:
      process.env.EXPO_PUBLIC_BUSINESS_UPI_ID ?? 'atharv@ybl',
    EXPO_PUBLIC_INVOICE_OWNER: process.env.EXPO_PUBLIC_INVOICE_OWNER ?? '',
    EXPO_PUBLIC_INVOICE_CITY: process.env.EXPO_PUBLIC_INVOICE_CITY ?? '',
    EXPO_PUBLIC_INVOICE_PHONE: process.env.EXPO_PUBLIC_INVOICE_PHONE ?? '',
    EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '',
  },
};

export default config;
