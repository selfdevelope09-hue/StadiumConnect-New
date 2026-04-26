/**
 * StadiumConnect payments: UPI (deep link + QR) and cash on delivery.
 * Staged tranches, invoice, and commission logic live in dedicated modules
 * re-exported below — no card gateway or third-party payment SDKs.
 */
import { Linking, Platform } from 'react-native';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { getBusinessUpiId, UPI_BUSINESS_NAME } from '@/config/upiConfig';
import { sendServerNotification, scheduleLocal } from '@/services/notificationService';
import type { CommissionBreakdown } from '@/types/payment';

const BOOKINGS = 'bookings';

const commissionRate = 0.05;
const gstOnCommission = 0.18;

export function calculateCommission(
  vendorPrice: number
): CommissionBreakdown {
  const commission = Math.round(vendorPrice * commissionRate * 100) / 100;
  const gst = Math.round(commission * gstOnCommission * 100) / 100;
  const platformFee = Math.round((commission + gst) * 100) / 100;
  const totalCharged = Math.round((vendorPrice + platformFee) * 100) / 100;
  return {
    vendorPrice,
    commission,
    gst,
    totalCharged,
    platformFee,
  };
}

/** How customers can pay (no in-app card SDKs). */
export const PAYMENT_METHODS = {
  UPI_DEEPLINK: 'upi_deeplink',
  UPI_QR: 'upi_qr',
  CASH_ON_DELIVERY: 'cod',
} as const;

export type PaymentMethodId =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

/**
 * Open system UPI with amount + VPA. Same URL works for GPay, PhonePe, Paytm, BHIM.
 * For staged bookings use `buildUpiIntentUrl` from `stagedPaymentService` (re-exported).
 */
export async function openUpiDeepLink(
  amountRupees: number,
  transactionNote: string
): Promise<boolean> {
  const upi = getBusinessUpiId();
  if (!upi || upi.startsWith('YOUR_')) {
    return false;
  }
  const am = amountRupees.toFixed(2);
  const tn = encodeURIComponent(transactionNote.slice(0, 80));
  const url = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(
    UPI_BUSINESS_NAME
  )}&am=${am}&cu=INR&tn=${tn}`;
  if (Platform.OS === 'web') {
    return false;
  }
  return Linking.canOpenURL(url).then((ok) => {
    if (ok) {
      return Linking.openURL(url);
    }
    return false;
  });
}

/**
 * In-app: prefer staged flow (`UPIPayment` screen) which also shows a static business QR.
 * This helper is for quick deep-link opens without a `bookingId` in the URL.
 * (Re-exported from `stagedPaymentService` at the end of this file.)
 */

export const paymentHelp = {
  qr: 'Open your UPI app and scan the StadiumConnect static QR, or use Pay to number.',
  cod: 'Pay the vendor in cash on delivery. Confirm with support if your booking is COD-only.',
} as const;

type CodBookingInput = {
  userId: string;
  vendorId: string;
  vendorName: string;
  service?: string;
  eventDate?: string;
  /** Expected cash amount in rupees (reference only) */
  expectedAmount: number;
};

/**
 * Create a **pending** booking for cash-on-delivery. Ops/vendor confirm when cash is received.
 */
export async function createCodPendingBooking(
  data: CodBookingInput
): Promise<string> {
  const ref = await addDoc(collection(db, BOOKINGS), {
    userId: data.userId,
    vendorId: data.vendorId,
    vendorName: data.vendorName,
    service: data.service,
    eventDate: data.eventDate,
    amount: data.expectedAmount,
    paymentModel: 'cod' as const,
    status: 'pending_cash' as const,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function notifyAfterCodBooking(
  userId: string,
  vendorId: string,
  data: {
    amount: number;
    bookingId: string;
    vendorName: string;
    userName: string;
    eventDate?: string;
  }
) {
  await sendServerNotification(userId, 'BOOKING_CONFIRMED', {
    vendorName: data.vendorName,
  });
  await sendServerNotification(vendorId, 'NEW_BOOKING_REQUEST', {
    userName: data.userName,
    amount: data.amount,
    eventDate: data.eventDate,
    bookingId: data.bookingId,
  });
  await scheduleLocal(
    'COD booking created',
    `${data.bookingId} — pay cash on delivery`,
    { bookingId: data.bookingId }
  );
}

export * from './stagedPaymentService';
export { calculateFinalPrice, type FinalPrice } from './pricingService';
export {
  buildInvoiceData,
  generateInvoiceHTML,
  generateAndShareInvoice,
  recordInvoiceAfterPayment,
  generateInvoiceNumber,
} from './invoiceService';
