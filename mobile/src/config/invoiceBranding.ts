import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as {
  EXPO_PUBLIC_INVOICE_OWNER?: string;
  EXPO_PUBLIC_INVOICE_CITY?: string;
  EXPO_PUBLIC_INVOICE_PHONE?: string;
  EXPO_PUBLIC_SUPPORT_EMAIL?: string;
};

/**
 * Shown in PDF header. Override in app.config / env.
 */
export function getInvoiceHeaderMeta() {
  return {
    ownerName:
      process.env.EXPO_PUBLIC_INVOICE_OWNER ||
      extra.EXPO_PUBLIC_INVOICE_OWNER ||
      'StadiumConnect Pvt. Ltd.',
    ownerCity:
      process.env.EXPO_PUBLIC_INVOICE_CITY || extra.EXPO_PUBLIC_INVOICE_CITY || 'Mumbai, Maharashtra',
    ownerPhone:
      process.env.EXPO_PUBLIC_INVOICE_PHONE || extra.EXPO_PUBLIC_INVOICE_PHONE || 'XXXXXXXXXX',
    supportEmail:
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL || extra.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@stadiumconnect.com',
  };
}
