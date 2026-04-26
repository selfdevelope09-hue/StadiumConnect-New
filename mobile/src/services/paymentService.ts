import { Platform } from 'react-native';
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '@/config/firebase';
import { getRazorpayKeyId, RAZORPAY_THEME, STADIUMCONNECT_LOGO } from '@/config/razorpayConfig';
import { sendServerNotification, scheduleLocal } from '@/services/notificationService';
import type { CommissionBreakdown, CreateOrderResponse, RazorpaySuccessPayload } from '@/types/payment';
const BOOKINGS = 'bookings';
const VENDORS = 'vendors';

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

type BookingData = {
  vendorId: string;
  userId: string;
  amount: number;
  vendorName: string;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
};

export type CreateRazorpayOrderResult = CreateOrderResponse;

export async function createRazorpayOrder(
  bookingData: BookingData
): Promise<CreateRazorpayOrderResult> {
  const createOrder = httpsCallable<
    {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
    },
    CreateOrderResponse
  >(functions, 'createRazorpayOrder');
  const result = await createOrder({
    amount: Math.round(bookingData.amount * 100),
    currency: bookingData.currency ?? 'INR',
    receipt: bookingData.receipt ?? `bk_${Date.now()}`,
    notes: {
      vendorId: bookingData.vendorId,
      userId: bookingData.userId,
      vendorName: bookingData.vendorName,
      ...bookingData.notes,
    },
  });
  if (!result.data) {
    throw new Error('No order returned. Deploy createRazorpayOrder in Firebase Cloud Functions.');
  }
  return result.data;
}

export type UserInfo = { email: string; contact: string; name: string };

type OpenCb = (data: RazorpaySuccessPayload) => void;
type ErrCb = (e: { code: string; description: string; error?: { description: string } }) => void;

/**
 * iOS / Android: native module. **Web** / **Expo Go**: use a dev build; web uses
 * checkout.js. Keys must come from `EXPO_PUBLIC_RAZORPAY_KEY_ID` in `.env`.
 */
export async function openRazorpayCheckout(
  orderData: { id: string; amount: number; currency: string; receipt?: string },
  userInfo: UserInfo,
  onSuccess: OpenCb,
  onFailure: ErrCb
): Promise<void> {
  const key = getRazorpayKeyId();
  if (!key) {
    onFailure({ code: 'KEY', description: 'Set EXPO_PUBLIC_RAZORPAY_KEY_ID in .env' });
    return;
  }
  if (Platform.OS === 'web') {
    return openRazorpayWeb(orderData, userInfo, key, onSuccess, onFailure);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RazorpayCheckout = require('react-native-razorpay') as { open: (o: object) => Promise<RazorpaySuccessPayload> };
  const options = {
    description: 'StadiumConnect booking',
    image: STADIUMCONNECT_LOGO,
    currency: orderData.currency || 'INR',
    key,
    amount: String(orderData.amount),
    order_id: orderData.id,
    name: 'StadiumConnect',
    prefill: {
      email: userInfo.email,
      contact: userInfo.contact,
      name: userInfo.name,
    },
    theme: { color: RAZORPAY_THEME },
  };
  try {
    const data = await RazorpayCheckout.open(options);
    onSuccess(data);
  } catch (e: unknown) {
    onFailure(
      (e as { code: string; description: string; error: { description: string } }) ||
        (e as { code: string; description: string })
    );
  }
}

function openRazorpayWeb(
  orderData: { id: string; amount: number; currency: string },
  userInfo: UserInfo,
  key: string,
  onSuccess: OpenCb,
  onFailure: ErrCb
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    onFailure({ code: 'WEB', description: 'Document not available' });
    return;
  }
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    startWebCheckout(orderData, userInfo, key, onSuccess, onFailure);
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.async = true;
  s.onload = () =>
    startWebCheckout(orderData, userInfo, key, onSuccess, onFailure);
  s.onerror = () => onFailure({ code: 'SCRIPT', description: 'Failed to load Razorpay' });
  document.body.appendChild(s);
}

function startWebCheckout(
  orderData: { id: string; amount: number; currency: string },
  userInfo: UserInfo,
  key: string,
  onSuccess: OpenCb,
  onFailure: ErrCb
) {
  const Rzp = (window as unknown as { Razorpay: new (o: object) => { open: () => void } })
    .Razorpay;
  if (!Rzp) {
    onFailure({ code: 'Rzp', description: 'Razorpay not available' });
    return;
  }
  const rzp = new Rzp({
    key,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'StadiumConnect',
    description: 'Booking',
    order_id: orderData.id,
    prefill: {
      name: userInfo.name,
      email: userInfo.email,
      contact: userInfo.contact,
    },
    theme: { color: RAZORPAY_THEME },
    handler(response: RazorpaySuccessPayload) {
      onSuccess(response);
    },
    modal: { ondismiss: () => {} },
  });
  rzp.open();
}

type BookingDetails = {
  userId: string;
  vendorId: string;
  amount: number;
  vendorName: string;
  service?: string;
  eventDate?: string;
  orderId: string;
};

export async function confirmBookingAfterPayment(
  payment: RazorpaySuccessPayload,
  details: BookingDetails
): Promise<string> {
  const commission = calculateCommission(details.amount);
  const ref = await addDoc(collection(db, BOOKINGS), {
    userId: details.userId,
    vendorId: details.vendorId,
    amount: details.amount,
    status: 'confirmed',
    paymentId: payment.razorpay_payment_id,
    orderId: payment.razorpay_order_id,
    orderIdRzp: details.orderId,
    vendorName: details.vendorName,
    service: details.service,
    eventDate: details.eventDate,
    commission,
    createdAt: serverTimestamp(),
    paidAt: serverTimestamp(),
  });
  const vendorRef = doc(db, VENDORS, details.vendorId);
  const toVendor = Math.max(
    0,
    details.amount - commission.platformFee
  );
  try {
    await updateDoc(vendorRef, {
      totalBookings: increment(1),
      totalEarnings: increment(toVendor),
    });
  } catch {
    // vendor doc may be missing; ignore
  }
  return ref.id;
}

export async function notifyAfterSuccessfulPayment(
  userId: string,
  vendorId: string,
  data: { amount: number; bookingId: string; vendorName: string; userName: string; eventDate?: string }
) {
  await sendServerNotification(userId, 'PAYMENT_SUCCESS', {
    amount: data.amount,
    bookingId: data.bookingId,
    vendorName: data.vendorName,
  });
  await sendServerNotification(vendorId, 'NEW_BOOKING_REQUEST', {
    userName: data.userName,
    amount: data.amount,
    eventDate: data.eventDate,
    bookingId: data.bookingId,
  });
  await scheduleLocal(
    'Payment received',
    `Booking ${data.bookingId} — ${data.vendorName}`,
    { bookingId: data.bookingId }
  );
}
