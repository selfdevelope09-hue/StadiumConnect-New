import type { Timestamp } from 'firebase/firestore';

export type CommissionBreakdown = {
  vendorPrice: number;
  commission: number;
  gst: number;
  totalCharged: number;
  platformFee: number;
};

export type CreateOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
  [k: string]: unknown;
};

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type BookingRecord = {
  userId: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed' | 'failed';
  paymentId?: string;
  orderId?: string;
  commission: CommissionBreakdown;
  vendorName?: string;
  service?: string;
  eventDate?: string;
  createdAt?: Timestamp;
  paidAt?: Timestamp;
};
