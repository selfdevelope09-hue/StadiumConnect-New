import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const brand = {
  primary: '#ff6b35',
  primaryDark: '#e55a2b',
  primaryLight: '#ff9068',
  dark: '#0a0a2a',
  darker: '#050517',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
} as const;

export function makeLightTheme(): MD3Theme {
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: brand.primary,
      primaryContainer: '#ffe8df',
      secondary: brand.purple,
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
      primaryContainer: '#5c2e1a',
      background: brand.dark,
      surface: '#12122a',
      secondary: brand.purple,
      error: brand.danger,
    },
  };
}
