import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { getPaymentStagesForCategory } from '@/config/paymentStages';
import { db, storage } from '@/config/firebase';
import { calculateFinalPrice } from '@/services/pricingService';
import { recordInvoiceAfterPayment } from '@/services/invoiceService';
import { sendServerNotification } from '@/services/notificationService';
import type {
  ProofSubmitInput,
  StagedRow,
  VerificationUI,
} from '@/types/stagedPayment';
import {
  getBusinessUpiId,
  UPI_BUSINESS_NAME,
} from '@/config/upiConfig';

const BOOK = 'bookings';
const VENDOR_PAYOUTS = 'vendorPayouts';
const ADMIN_TASKS = 'adminTasks';

const COMMISSION = 0.05;
const VERIFY_THRESHOLD = 5000;

export { VERIFY_THRESHOLD, COMMISSION, getBusinessUpiId, UPI_BUSINESS_NAME };

export function getVerificationMethod(
  amount: number
): VerificationUI {
  if (amount < VERIFY_THRESHOLD) {
    return {
      method: 'manual',
      instruction: 'Payment karo aur screenshot upload karo',
      adminAction: 'Manual review within 2 hours',
      ui: 'screenshot',
    };
  }
  return {
    method: 'utr',
    instruction: 'UTR number enter karo (UPI app mein milega)',
    adminAction: 'Priority review within 30 minutes',
    ui: 'utr',
  };
}

type BookingCreateData = {
  userId: string;
  vendorId: string;
  vendorName: string;
  service?: string;
  eventDate?: string;
  notes?: string;
};

/**
 * Splits the **customer order total** (incl. all fees) across category stages.
 */
export function buildPaymentRowsFromTotalPayable(
  vendorCategory: string,
  customerOrderTotal: number
): StagedRow[] {
  const template = getPaymentStagesForCategory(vendorCategory);
  return template.map((s) => {
    const amount =
      s.percent > 0
        ? Math.round((customerOrderTotal * s.percent) / 100)
        : 0;
    const status: StagedRow['status'] =
      s.percent === 0 || amount === 0 ? 'waived' : 'pending';
    return {
      stage: s.stage,
      percent: s.percent,
      label: s.label,
      trigger: s.trigger,
      releaseAfter: s.releaseAfter,
      amount,
      status,
      paidAt: null,
      utrNumber: null,
      screenshotUrl: null,
      proofSubmittedAt: null,
      verifiedBy: null,
      releasedAt: null,
    } satisfies StagedRow;
  });
}

/** Fix one-rupee drift so stage sums equal `targetTotal`. */
export function fixStageAmountSum(
  rows: StagedRow[],
  targetTotal: number
): StagedRow[] {
  const out = rows.map((r) => ({ ...r }));
  const sum = out.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);
  const diff = Math.round((targetTotal - sum) * 100) / 100;
  if (Math.abs(diff) < 0.01) {
    return out;
  }
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].amount > 0) {
      out[i] = {
        ...out[i],
        amount: Math.round((out[i].amount + diff) * 100) / 100,
      };
      break;
    }
  }
  return out;
}

function firstPayableIndex(rows: StagedRow[]): number {
  const i = rows.findIndex(
    (r) => r.amount > 0 && r.status === 'pending'
  );
  return i;
}

/**
 * UPI-staged booking: all money to business UPI; you verify and queue vendor
 * release net of 5% per tranche.
 */
/**
 * @param vendorBasePrice — vendor quote (e.g. ₹50,000). Customer UPI tranches
 *   use `calculateFinalPrice` total; stages are % of that customer total.
 */
export async function createBookingWithStages(
  bookingData: BookingCreateData,
  vendorCategory: string,
  vendorBasePrice: number
): Promise<string> {
  const cat = String(vendorCategory).toLowerCase() || 'caterer';
  const pricing = calculateFinalPrice(vendorBasePrice, 0);
  let paymentStages = buildPaymentRowsFromTotalPayable(
    cat,
    pricing.totalPayable
  );
  paymentStages = fixStageAmountSum(paymentStages, pricing.totalPayable);
  const currentStageIndex = firstPayableIndex(paymentStages);
  const refb = await addDoc(collection(db, BOOK), {
    ...bookingData,
    vendorBasePrice,
    totalAmount: pricing.totalPayable,
    commission: 0,
    vendorReceivesTotal: pricing._vendorReceives,
    vendorCategory: cat,
    paymentModel: 'upi_staged' as const,
    paymentStages,
    currentStageIndex: currentStageIndex < 0 ? 0 : currentStageIndex,
    overallStatus: 'payment_pending' as const,
    createdAt: serverTimestamp(),
  });
  return refb.id;
}

export async function uploadPaymentProofImage(
  bookingId: string,
  stageIndex: number,
  fileUri: string,
  mime: string
): Promise<string> {
  const b = await fetch(fileUri);
  const blob = await b.blob();
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const r = ref(
    storage,
    `payment-proofs/${bookingId}/stage-${stageIndex}/${Date.now()}.${ext}`
  );
  await uploadBytes(r, blob, { contentType: mime });
  return getDownloadURL(r);
}

/**
 * Screenshot (URL) or UTR string in `value`.
 * `stageIndex` is 0-based.
 */
export async function submitPaymentProof(
  bookingId: string,
  stageIndex: number,
  proof: ProofSubmitInput
): Promise<void> {
  const bookingRef = doc(db, BOOK, bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) {
    throw new Error('Booking not found');
  }
  const data = snap.data() as {
    paymentStages: StagedRow[];
    userId: string;
    vendorId: string;
  };
  const stages = [...data.paymentStages];
  const s = { ...stages[stageIndex] };
  if (!s) {
    throw new Error('Invalid stage');
  }
  s.status = proof.type === 'utr' && proof.amount >= VERIFY_THRESHOLD
    ? 'verifying'
    : 'proof_submitted';
  s.proofSubmittedAt = serverTimestamp() as never;
  if (proof.type === 'utr') {
    s.utrNumber = proof.value;
  } else {
    s.screenshotUrl = proof.value;
  }
  stages[stageIndex] = s;
  await updateDoc(bookingRef, {
    paymentStages: stages,
    overallStatus: 'payment_pending' as const,
  });

  const taskPriority: 'high' | 'normal' =
    proof.amount >= VERIFY_THRESHOLD ? 'high' : 'normal';
  await addDoc(collection(db, ADMIN_TASKS), {
    type: 'verify_payment' as const,
    status: 'pending' as const,
    bookingId,
    stageIndex,
    amount: proof.amount,
    proofType: proof.type,
    proofValue: proof.value,
    priority: taskPriority,
    userId: data.userId,
    vendorId: data.vendorId,
    createdAt: serverTimestamp(),
  });
}

export async function verifyAndReleasePayment(
  bookingId: string,
  stageIndex: number,
  adminId: string
): Promise<void> {
  const bookingRef = doc(db, BOOK, bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) {
    throw new Error('Booking not found');
  }
  const data = snap.data() as {
    paymentStages: StagedRow[];
    userId: string;
    vendorId: string;
    paymentModel?: string;
  };
  const stages = data.paymentStages.map((r) => ({ ...r }));
  const row = stages[stageIndex];
  if (!row) {
    throw new Error('Invalid stage');
  }
  const stageNum = row.stage;
  row.status = 'paid' as const;
  row.verifiedBy = adminId;
  row.paidAt = serverTimestamp() as never;
  const gross = row.amount;
  const fee = Math.round(gross * COMMISSION * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);

  const allPaid = stages
    .filter((r) => r.amount > 0)
    .every((r) => r.status === 'paid' || r.status === 'waived');
  const nextIdx = allPaid
    ? 0
    : (() => {
        const u = stages.findIndex(
          (r) =>
            r.amount > 0 &&
            r.status !== 'paid' &&
            r.status !== 'waived'
        );
        return u < 0 ? 0 : u;
      })();
  const overallStatus = allPaid ? 'fully_paid' : 'partially_paid';

  await updateDoc(bookingRef, {
    paymentStages: stages,
    currentStageIndex: nextIdx,
    overallStatus,
  });

  await addDoc(collection(db, VENDOR_PAYOUTS), {
    vendorId: data.vendorId,
    bookingId,
    stageIndex,
    grossAmount: gross,
    commission: fee,
    netAmount: net,
    status: 'pending_transfer' as const,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'transactions'), {
    type: 'commission' as const,
    amount: fee,
    vendorId: data.vendorId,
    bookingId,
    stageIndex,
    timestamp: serverTimestamp(),
  });

  const nextUnpaid = allPaid
    ? undefined
    : stages.find(
        (r) =>
          r.amount > 0 &&
          r.status !== 'paid' &&
          r.status !== 'waived'
      );
  const nextN = nextUnpaid
    ? `Stage ${nextUnpaid.stage} — ${nextUnpaid.label}`
    : 'Complete';

  await sendServerNotification(data.vendorId, 'PAYMENT_RECEIVED', {
    amount: net,
    stage: stageNum,
    bookingId,
  });
  await sendServerNotification(data.userId, 'PAYMENT_CONFIRMED', {
    stage: stageNum,
    nextStage: nextN,
    bookingId,
  });

  void recordInvoiceAfterPayment(bookingId).catch(() => {});
}

export async function rejectPaymentProof(
  bookingId: string,
  stageIndex: number
): Promise<void> {
  const bookingRef = doc(db, BOOK, bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) {
    return;
  }
  const data = snap.data() as { paymentStages: StagedRow[] };
  const stages = [...data.paymentStages];
  const s = { ...stages[stageIndex] };
  s.status = 'rejected' as const;
  s.utrNumber = null;
  s.screenshotUrl = null;
  s.proofSubmittedAt = null;
  stages[stageIndex] = { ...s, status: 'pending' as const };
  await updateDoc(bookingRef, { paymentStages: stages });
}

export async function resolveAdminTask(
  taskId: string,
  resolution: 'approved' | 'rejected',
  adminId: string
): Promise<void> {
  const tref = doc(db, ADMIN_TASKS, taskId);
  const t = await getDoc(tref);
  if (!t.exists()) {
    return;
  }
  const d = t.data() as { bookingId: string; stageIndex: number; status: string };
  if (d.status !== 'pending') {
    return;
  }
  if (resolution === 'approved') {
    await verifyAndReleasePayment(d.bookingId, d.stageIndex, adminId);
    await updateDoc(tref, {
      status: 'done' as const,
      resolvedAt: serverTimestamp(),
      resolvedBy: adminId,
    });
  } else {
    await rejectPaymentProof(d.bookingId, d.stageIndex);
    await updateDoc(tref, {
      status: 'rejected' as const,
      resolvedAt: serverTimestamp(),
      resolvedBy: adminId,
    });
  }
}

export function buildUpiIntentUrl(
  amountRupees: number,
  bookingId: string,
  stageIndex: number
): string {
  const pa = getBusinessUpiId();
  const am = amountRupees.toFixed(2);
  const tn = encodeURIComponent(
    `StadiumConnect_${bookingId}_S${stageIndex + 1}`
  );
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(
    UPI_BUSINESS_NAME
  )}&am=${am}&cu=INR&tn=${tn}`;
}
