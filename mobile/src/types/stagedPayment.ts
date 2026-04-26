import type { Timestamp } from 'firebase/firestore';

export type StageStatus =
  | 'pending'
  | 'waived'
  | 'proof_submitted'
  | 'verifying'
  | 'paid'
  | 'rejected'
  | 'released_to_vendor';

export type StagedRow = {
  stage: number;
  percent: number;
  label: string;
  trigger: string;
  releaseAfter: string | null;
  amount: number;
  status: StageStatus;
  paidAt: Timestamp | null;
  utrNumber: string | null;
  screenshotUrl: string | null;
  proofSubmittedAt: Timestamp | null;
  verifiedBy: string | null;
  releasedAt: Timestamp | null;
};

export type StagedOverallStatus =
  | 'draft'
  | 'payment_pending'
  | 'partially_paid'
  | 'fully_paid'
  | 'closed';

export type StagedBookingRecord = {
  userId: string;
  vendorId: string;
  vendorName: string;
  service?: string;
  eventDate?: string;
  /** Category key used for `PAYMENT_STAGES` (e.g. caterer) */
  vendorCategory: string;
  /** Vendor's quoted job price (before 15% hidden platform markup) */
  vendorBasePrice?: number;
  /** Customer's order total to collect (UPI tranches; equals invoice total) */
  totalAmount: number;
  /** Retained for legacy; per-tranche fee is in payout records */
  commission: number;
  /** Same as vendor quote at booking (vendor net for the project, before tranche cut) */
  vendorReceivesTotal: number;
  /** Assigned on first PDF */
  invoiceNumber?: string;
  paymentModel: 'upi_staged';
  paymentStages: StagedRow[];
  /** 0-based index of the next / active stage pointer */
  currentStageIndex: number;
  overallStatus: StagedOverallStatus;
  createdAt?: Timestamp;
};

export type AdminTaskType = 'verify_payment';

export type AdminTask = {
  type: AdminTaskType;
  status: 'pending' | 'done' | 'rejected';
  bookingId: string;
  stageIndex: number;
  amount: number;
  proofType: 'screenshot' | 'utr';
  /** Download URL (screenshot) or UTR string */
  proofValue: string;
  priority: 'high' | 'normal';
  userId: string;
  vendorId: string;
  createdAt: Timestamp;
};

export type ProofSubmitInput = {
  type: 'screenshot' | 'utr';
  value: string;
  amount: number;
};

export type VerificationUI = {
  method: 'manual' | 'utr';
  instruction: string;
  adminAction: string;
  ui: 'screenshot' | 'utr';
};
