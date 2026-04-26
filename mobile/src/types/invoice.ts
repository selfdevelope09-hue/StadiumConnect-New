import type { FinalPrice } from '@/services/pricingService';

export type InvoiceCustomer = {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  email: string;
};

export type InvoiceVendor = {
  id: string;
  name: string;
  category: string;
  city: string;
  serviceDescription: string;
  /** Display strings */
  rating: string;
  reviews: string;
};

export type InvoiceBookingMeta = {
  ownerName: string;
  ownerCity: string;
  ownerPhone: string;
  supportEmail: string;
  invoiceNumber: string;
  bookingId: string;
  invoiceDate: string;
  eventDate: string;
  status: string;
};

export type InvoiceStageRow = {
  stage: number;
  label: string;
  percent: number;
  amount: number;
  dueText: string;
  displayStatus: 'paid' | 'pending' | 'locked' | 'waived' | 'verifying';
  paidAtText: string;
};

export type InvoiceData = {
  booking: InvoiceBookingMeta;
  customer: InvoiceCustomer;
  vendor: InvoiceVendor;
  pricing: FinalPrice;
  stages: InvoiceStageRow[];
  /** e.g. PAID IN FULL */
  footnote: string;
};
