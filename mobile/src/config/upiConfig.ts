import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as {
  EXPO_PUBLIC_BUSINESS_UPI_ID?: string;
};

/**
 * UPI VPA to receive all collections (e.g. stadiumconnect@hdfcbank).
 * Set `EXPO_PUBLIC_BUSINESS_UPI_ID` in `.env` / `app.config` extra.
 */
export function getBusinessUpiId(): string {
  return (
    process.env.EXPO_PUBLIC_BUSINESS_UPI_ID ||
    extra.EXPO_PUBLIC_BUSINESS_UPI_ID ||
    'YOUR_UPI_ID@ybl'
  );
}

export const UPI_BUSINESS_NAME = 'StadiumConnect';
