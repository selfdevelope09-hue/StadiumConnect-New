import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as {
  EXPO_PUBLIC_BUSINESS_UPI_ID?: string;
};

/**
 * UPI VPA to receive all collections. Match the VPA in `assets/images/stadium-qr.png`
 * (PhonePe QR) or set `EXPO_PUBLIC_BUSINESS_UPI_ID` in `.env` / `app.config` `extra`.
 */
const DEFAULT_UPI_VPA = 'atharv@ybl';

/**
 * UPI VPA to receive all collections (e.g. stadiumconnect@hdfcbank).
 * Set `EXPO_PUBLIC_BUSINESS_UPI_ID` in `.env` / `app.config` extra.
 */
export function getBusinessUpiId(): string {
  return (
    process.env.EXPO_PUBLIC_BUSINESS_UPI_ID ||
    extra.EXPO_PUBLIC_BUSINESS_UPI_ID ||
    DEFAULT_UPI_VPA
  );
}

/**
 * `pn` field in UPI deep links and all in-app payee / invoice copy.
 * (Banking apps may still show the bank-registered name when a payment is opened.)
 */
export const UPI_BUSINESS_NAME = 'StadiumConnect';

export const UPI_PRIMARY_APP = 'PhonePe' as const;
