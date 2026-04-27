import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const brand = {
  primary: '#ff7a1a',
  primaryDark: '#e86600',
  primaryLight: '#ffb066',
  dark: '#0f2a43',
  darker: '#0b1f33',
  blueBg: '#f7fbff',
  blueSurface: '#eef6ff',
  blueBorder: '#cfe7ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#2a8cff',
  purple: '#8b5cf6',
  supportEmail: 'stadiumconnect9@gmail.com',
  supportPhone: '7972343530',
  ownerName: 'StadiumConnect',
  ownerCity: 'India',
  ownerPhone: '7972343530',
} as const;

export function makeLightTheme(): MD3Theme {
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: brand.primary,
      primaryContainer: '#fff1e2',
      secondary: brand.info,
      secondaryContainer: brand.blueSurface,
      background: '#ffffff',
      surface: '#ffffff',
      surfaceVariant: brand.blueSurface,
      outline: brand.blueBorder,
      error: brand.danger,
    },
  };
}

export function makeDarkTheme(): MD3Theme {
  return {
    ...MD3DarkTheme,
    dark: true,
    colors: {
      ...MD3DarkTheme.colors,
      primary: brand.primary,
      primaryContainer: '#5b2d00',
      background: '#10253a',
      surface: '#17324c',
      secondary: '#7fc0ff',
      error: brand.danger,
    },
  };
}
