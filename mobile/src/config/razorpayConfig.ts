import Constants from 'expo-constants';

export function getRazorpayKeyId(): string {
  const e = Constants.expoConfig?.extra;
  if (e && typeof e === 'object' && 'EXPO_PUBLIC_RAZORPAY_KEY_ID' in e) {
    const v = (e as Record<string, unknown>).EXPO_PUBLIC_RAZORPAY_KEY_ID;
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? '';
}

export const RAZORPAY_THEME = '#FF6B35';
export const STADIUMCONNECT_LOGO = 'https://i.imgur.com/2nY0xZ0.png';
