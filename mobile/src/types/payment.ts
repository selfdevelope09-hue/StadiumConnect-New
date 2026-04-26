import type { Timestamp } from 'firebase/firestore';

export type CommissionBreakdown = {
  vendorPrice: number;
  commission: number;
  gst: number;
  totalCharged: number;
  platformFee: number;
};

export type BookingRecord = {
  userId: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed' | 'failed' | 'pending_cash';
  paymentId?: string;
  orderId?: string;
  paymentModel?: 'upi_staged' | 'cod';
  commission?: CommissionBreakdown;
  vendorName?: string;
  service?: string;
  eventDate?: string;
  createdAt?: Timestamp;
  paidAt?: Timestamp;
};
