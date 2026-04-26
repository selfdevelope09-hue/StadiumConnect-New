import {
  cacheDirectory,
  copyAsync,
  documentDirectory,
} from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { getInvoiceHeaderMeta } from '@/config/invoiceBranding';
import { db, storage } from '@/config/firebase';
import { calculateFinalPrice, type FinalPrice } from '@/services/pricingService';
import type { InvoiceData, InvoiceStageRow } from '@/types/invoice';
import type { StagedBookingRecord } from '@/types/stagedPayment';

const INVOICE_COLLECTION = 'invoices';
const COUNTERS = 'counters';
const COUNTER_INVOICES = 'invoices';

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTimestamp(t: unknown): string {
  if (t == null) {
    return '';
  }
  if (
    typeof t === 'object' &&
    t !== null &&
    'toDate' in t &&
    typeof (t as { toDate: () => Date }).toDate === 'function'
  ) {
    try {
      return fmtDate((t as { toDate: () => Date }).toDate());
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Monotonic per calendar month: YYYYMM-00001
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const cRef = doc(db, COUNTERS, COUNTER_INVOICES);
  const n = await runTransaction(db, async (tx) => {
    const s = await tx.get(cRef);
    const d = s.data() as
      | { yearMonth?: string; count?: number }
      | undefined;
    const key = `${y}${m}`;
    if (!s.exists() || d?.yearMonth !== key) {
      tx.set(
        cRef,
        { yearMonth: key, count: 1, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return 1;
    }
    const next = (d?.count ?? 0) + 1;
    tx.set(
      cRef,
      { yearMonth: key, count: next, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return next;
  });
  return `${y}${m}-${String(n).padStart(5, '0')}`;
}

async function getOrCreateInvoiceNumberForBooking(
  bookingId: string
): Promise<string> {
  const bref = doc(db, 'bookings', bookingId);
  const s = await getDoc(bref);
  if (!s.exists()) {
    throw new Error('Booking not found');
  }
  const inv = s.data() as { invoiceNumber?: string };
  if (inv.invoiceNumber) {
    return inv.invoiceNumber;
  }
  const num = await generateInvoiceNumber();
  await updateDoc(bref, {
    invoiceNumber: num,
    invoiceNumberAt: serverTimestamp(),
  });
  return num;
}

function buildStageDisplayRows(
  b: StagedBookingRecord
): InvoiceStageRow[] {
  return b.paymentStages.map((r, idx) => {
    const isLocked =
      r.amount > 0 &&
      r.status === 'pending' &&
      b.paymentStages.some(
        (x, j) => j < idx && x.amount > 0 && x.status !== 'paid' && x.status !== 'waived'
      );
    let displayStatus: InvoiceStageRow['displayStatus'] = 'pending';
    if (r.status === 'paid') {
      displayStatus = 'paid';
    } else if (r.status === 'waived' || r.amount === 0) {
      displayStatus = 'waived';
    } else if (r.status === 'verifying' || r.status === 'proof_submitted') {
      displayStatus = 'verifying';
    } else if (isLocked) {
      displayStatus = 'locked';
    } else {
      displayStatus = 'pending';
    }
    const dueText =
      r.trigger === 'on_booking'
        ? 'On booking'
        : r.trigger === 'manual_by_user'
          ? (b.eventDate ? `By event: ${b.eventDate}` : 'As per milestone')
          : (r.trigger ?? '—');
    return {
      stage: r.stage,
      label: r.label,
      percent: r.percent,
      amount: r.amount,
      dueText: escapeXml(dueText),
      displayStatus,
      paidAtText: fmtTimestamp(r.paidAt) || (r.status === 'paid' ? '—' : ''),
    };
  });
}

export async function buildInvoiceData(
  bookingId: string
): Promise<InvoiceData> {
  const bSnap = await getDoc(doc(db, 'bookings', bookingId));
  if (!bSnap.exists()) {
    throw new Error('Booking not found');
  }
  const b = bSnap.data() as StagedBookingRecord & { invoiceNumber?: string };
  if (b.paymentModel !== 'upi_staged') {
    throw new Error('Invoices are generated for UPI-staged bookings');
  }
  const vendorBase =
    typeof b.vendorBasePrice === 'number'
      ? b.vendorBasePrice
      : b.totalAmount;
  const discount = 0;
  const pricing: FinalPrice = calculateFinalPrice(vendorBase, discount);
  const invoiceNumber =
    b.invoiceNumber || (await getOrCreateInvoiceNumberForBooking(bookingId));
  const u = await getDoc(doc(db, 'users', b.userId));
  const uData = u.data() as
    | {
        displayName?: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
      }
    | undefined;
  const v = await getDoc(doc(db, 'vendors', b.vendorId));
  const vData = v.data() as
    | {
        name?: string;
        city?: string;
        category?: string;
        rating?: number;
        reviewCount?: number;
        serviceDescription?: string;
        businessName?: string;
      }
    | undefined;
  const customer = {
    id: b.userId,
    name: uData?.displayName || uData?.email || 'Customer',
    phone: (uData?.phone as string) || '—',
    city: (uData?.city as string) || '—',
    state: (uData?.state as string) || '—',
    email: (uData?.email as string) || '—',
  };
  const vendor = {
    id: b.vendorId,
    name: vData?.businessName || vData?.name || b.vendorName,
    category: b.vendorCategory || (vData?.category as string) || 'Service',
    city: (vData?.city as string) || '—',
    serviceDescription: (vData?.serviceDescription as string) || b.service || 'Event service',
    rating: vData?.rating != null ? String(vData.rating) : '—',
    reviews: vData?.reviewCount != null ? String(vData.reviewCount) : '0',
  };
  const brand = getInvoiceHeaderMeta();
  const now = new Date();
  const allPaid = b.paymentStages
    .filter((r) => r.amount > 0)
    .every((r) => r.status === 'paid' || r.status === 'waived');
  const anyPaid = b.paymentStages.some((r) => r.status === 'paid');
  const statusLabel = allPaid
    ? 'PAID IN FULL'
    : anyPaid
      ? 'PARTIALLY PAID'
      : 'PAYMENT PENDING';
  return {
    booking: {
      ownerName: brand.ownerName,
      ownerCity: brand.ownerCity,
      ownerPhone: brand.ownerPhone,
      supportEmail: brand.supportEmail,
      invoiceNumber,
      bookingId: bSnap.id,
      invoiceDate: fmtDate(now),
      eventDate: b.eventDate || 'TBD',
      status: statusLabel,
    },
    customer,
    vendor,
    pricing,
    stages: buildStageDisplayRows(b),
    footnote: allPaid
      ? 'This booking is fully paid as per the schedule above.'
      : 'Pay each stage on time to keep your event confirmed.',
  };
}

function stageStatusCell(row: InvoiceStageRow): string {
  const base = (() => {
    if (row.displayStatus === 'paid') {
      return '✅ PAID';
    }
    if (row.displayStatus === 'waived') {
      return '— N/A';
    }
    if (row.displayStatus === 'locked') {
      return '🔒 LOCKED';
    }
    if (row.displayStatus === 'verifying') {
      return '⏳ VERIFYING';
    }
    return '⏳ PENDING';
  })();
  const paid = row.paidAtText
    ? `<div class="desc-small">${escapeXml(row.paidAtText)}</div>`
    : '';
  return base + paid;
}

export function generateInvoiceHTML(d: InvoiceData): string {
  const p = d.pricing;
  const b = d.booking;
  const c = d.customer;
  const v = d.vendor;
  const stRows = d.stages
    .map(
      (s) => `
        <tr>
          <td style="text-align:center;font-weight:bold">${s.stage}</td>
          <td>
            ${escapeXml(s.label)}
            <div class="desc-small">${s.percent > 0 ? `${s.percent}% of order total` : '—'}</div>
          </td>
          <td>${inr(s.amount)}</td>
          <td style="font-size:12px">${s.dueText}</td>
          <td class="status-${
            s.displayStatus === 'paid'
              ? 'paid'
              : s.displayStatus === 'pending' || s.displayStatus === 'verifying'
                ? 'pending'
                : s.displayStatus === 'locked'
                  ? 'locked'
                  : 'waived'
          }">
            ${stageStatusCell(s)}
          </td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
    .header { 
      background: linear-gradient(135deg, #FF6B35, #FF8C42);
      color: white; padding: 25px; border-radius: 10px;
      display: flex; justify-content: space-between;
    }
    .logo { font-size: 24px; font-weight: bold; }
    .invoice-title { 
      text-align: center; margin: 20px 0;
      font-size: 20px; font-weight: bold;
      color: #FF6B35; letter-spacing: 2px;
    }
    .invoice-meta {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px;
      background: #f8f8f8; padding: 15px; border-radius: 8px;
      margin: 15px 0;
    }
    .parties { 
      display: flex; justify-content: space-between; 
      margin: 20px 0; gap: 20px; flex-wrap: wrap;
    }
    .party-box { 
      flex: 1; min-width: 200px; border: 1px solid #eee; 
      padding: 15px; border-radius: 8px;
    }
    .party-title { 
      font-weight: bold; color: #FF6B35; 
      margin-bottom: 8px; font-size: 12px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { 
      background: #FF6B35; color: white; 
      padding: 12px; text-align: left; font-size: 13px;
    }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) { background: #fff8f5; }
    .desc-small { font-size: 11px; color: #888; margin-top: 3px; }
    .totals { 
      margin-left: auto; max-width: 300px; 
      border: 1px solid #eee; border-radius: 8px; overflow: hidden;
    }
    .total-row { 
      display: flex; justify-content: space-between; 
      padding: 10px 15px; font-size: 13px;
    }
    .total-row.gst { background: #fff8f5; }
    .total-row.final { 
      background: #FF6B35; color: white; 
      font-weight: bold; font-size: 16px;
    }
    .stages-table th { background: #333; }
    .status-paid { color: #22c55e; font-weight: bold; }
    .status-pending { color: #f59e0b; font-weight: bold; }
    .status-locked { color: #94a3b8; font-weight: bold; }
    .status-waived { color: #94a3b8; }
    .terms { 
      margin-top: 30px; padding: 15px;
      background: #f8f8f8; border-radius: 8px;
      font-size: 11px; color: #666; line-height: 1.6;
    }
    .footer { 
      text-align: center; margin-top: 25px;
      color: #FF6B35; font-style: italic;
    }
    .watermark {
      text-align: center; color: #999;
      font-size: 11px; margin-top: 10px;
    }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .badge-orange { background: #FFF0EA; color: #FF6B35; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🏟️ STADIUMCONNECT</div>
      <div style="font-size:12px; margin-top:5px; opacity:0.9">Premium Event Services Platform</div>
      <div style="font-size:11px; margin-top:8px; opacity:0.8">
        ${escapeXml(b.ownerName)} | ${escapeXml(b.ownerCity)}<br>
        ${escapeXml(b.supportEmail)} | +91 ${escapeXml(b.ownerPhone)}
      </div>
    </div>
    <div style="text-align:right; font-size:13px; opacity:0.9">TAX INVOICE</div>
  </div>
  <div class="invoice-title">TAX INVOICE</div>
  <div class="invoice-meta">
    <div><div style="font-size:11px;color:#888">INVOICE NUMBER</div>
      <div style="font-weight:bold">SC-${escapeXml(b.invoiceNumber)}</div></div>
    <div><div style="font-size:11px;color:#888">BOOKING ID</div>
      <div style="font-weight:bold">BK-${escapeXml(b.bookingId)}</div></div>
    <div><div style="font-size:11px;color:#888">INVOICE DATE</div>
      <div style="font-weight:bold">${escapeXml(b.invoiceDate)}</div></div>
    <div><div style="font-size:11px;color:#888">EVENT DATE</div>
      <div style="font-weight:bold">${escapeXml(b.eventDate)}</div></div>
    <div><div style="font-size:11px;color:#888">STATUS</div>
      <span class="badge badge-orange">${escapeXml(b.status)}</span></div>
  </div>
  <div class="parties">
    <div class="party-box">
      <div class="party-title">Billed to (Customer)</div>
      <div style="font-weight:bold;font-size:15px">${escapeXml(c.name)}</div>
      <div style="color:#666;font-size:13px;margin-top:5px">
        ${escapeXml(c.phone)}<br>
        ${escapeXml(c.city)}, ${escapeXml(c.state)}<br>
        ${escapeXml(c.email)}
      </div>
    </div>
    <div class="party-box">
      <div class="party-title">Service by</div>
      <div style="font-weight:bold;font-size:15px">${escapeXml(v.name)}</div>
      <div style="color:#666;font-size:13px;margin-top:5px">
        ${escapeXml(v.category)}<br>
        ${escapeXml(v.city)}<br>
        ⭐ ${escapeXml(v.rating)}/5 (${escapeXml(v.reviews)} reviews)
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:50%">Description</th>
        <th style="width:12%">Qty</th>
        <th style="width:15%">Rate</th>
        <th style="width:15%">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>${escapeXml(v.category)} services</strong>
          <div class="desc-small">${escapeXml(v.serviceDescription)}</div></td>
        <td>1</td>
        <td>${inr(p.vendorPrice)}</td>
        <td>${inr(p.vendorPrice)}</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Platform service fee</strong>
          <div class="desc-small">Online booking, vendor management &amp; support</div></td>
        <td>1</td>
        <td>${inr(p.platformServiceFee)}</td>
        <td>${inr(p.platformServiceFee)}</td>
      </tr>
      <tr>
        <td>3</td>
        <td><strong>Convenience fee</strong>
          <div class="desc-small">Digital payment &amp; processing</div></td>
        <td>1</td>
        <td>₹${p.convenienceFee}</td>
        <td>₹${p.convenienceFee}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${inr(p.subtotal)}</span></div>
    <div class="total-row gst"><span>GST @18%</span><span>${inr(p.gst)}</span></div>
    <div class="total-row" style="border-top:2px solid #FF6B35">
      <span style="font-size:11px;color:#888">Promo / discount</span>
      <span style="color:#22c55e">−${inr(p.discount)}</span>
    </div>
    <div class="total-row final"><span>TOTAL PAYABLE</span><span>${inr(p.totalPayable)}</span></div>
  </div>
  <div style="margin-top:20px;padding:12px 15px;border:1px solid #eee;border-radius:8px;background:#fffaf5;font-size:13px;line-height:1.5">
    <div style="font-weight:bold;margin-bottom:4px">UPI &amp; collections</div>
    <div>Payee Name: StadiumConnect</div>
    <div>Description: StadiumConnect Official Payment</div>
  </div>
  <div style="margin-top:30px">
    <div style="font-weight:bold;font-size:15px;margin-bottom:10px">Payment schedule</div>
    <table class="stages-table">
      <thead>
        <tr>
          <th>Stage</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Due / note</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${stRows}</tbody>
    </table>
  </div>
  <div class="terms">
    <strong>Terms &amp; conditions</strong><br>
    • Payments are subject to StadiumConnect cancellation policy.<br>
    • StadiumConnect is a technology marketplace connecting you with independent service providers.<br>
    • GST is charged as per Government of India regulations.<br>
    • Staged UPI payments are released to vendors after verification.<br>
    • ${escapeXml(d.footnote)}<br>
    • This is a computer-generated tax invoice; signature not required.
  </div>
  <div class="footer">
    <strong>Thank you for choosing StadiumConnect</strong><br>
    <em>Creating memories, one event at a time</em>
  </div>
  <div class="watermark">
    Verify: stadiumconnect.com · Invoice SC-${escapeXml(b.invoiceNumber)}
  </div>
</body>
</html>`;
}

export type InvoiceGenResult = {
  success: boolean;
  uri?: string;
  pdfUrl?: string;
  error?: string;
};

export async function saveInvoiceToStorage(
  localUri: string,
  bookingId: string
): Promise<string> {
  const b = await fetch(localUri);
  const blob = await b.blob();
  const r = ref(storage, `invoices/${bookingId}/${Date.now()}.pdf`);
  await uploadBytes(r, blob, { contentType: 'application/pdf' });
  return getDownloadURL(r);
}

/**
 * After a stage is verified, regenerate PDF, upload, and write `invoices` row (no share sheet).
 */
export async function recordInvoiceAfterPayment(bookingId: string): Promise<InvoiceGenResult> {
  try {
    const data = await buildInvoiceData(bookingId);
    const html = generateInvoiceHTML(data);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const name = `SC-Invoice-${data.booking.invoiceNumber}.pdf`;
    const base = documentDirectory || cacheDirectory || '';
    const target = base + name;
    if (base) {
      await copyAsync({ from: uri, to: target });
    }
    const uploadUri = base ? target : uri;
    const pdfUrl = await saveInvoiceToStorage(uploadUri, bookingId);
    await addDoc(collection(db, INVOICE_COLLECTION), {
      bookingId,
      invoiceNumber: data.booking.invoiceNumber,
      customerId: data.customer.id,
      vendorId: data.vendor.id,
      totalAmount: data.pricing.totalPayable,
      pdfUrl,
      status: data.booking.status,
      createdAt: serverTimestamp(),
    });
    return { success: true, uri: uploadUri, pdfUrl };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Invoice save failed',
    };
  }
}

/**
 * Create PDF, persist to Storage + Firestore, and open the system share sheet (WhatsApp, etc.).
 */
export async function generateAndShareInvoice(
  bookingId: string
): Promise<InvoiceGenResult> {
  try {
    const data = await buildInvoiceData(bookingId);
    const html = generateInvoiceHTML(data);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const name = `SC-Invoice-${data.booking.invoiceNumber}.pdf`;
    const base = documentDirectory || cacheDirectory || '';
    const target = base + name;
    if (base) {
      await copyAsync({ from: uri, to: target });
    }
    const shareUri = base ? target : uri;
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Share invoice',
      });
    }
    const pdfUrl = await saveInvoiceToStorage(shareUri, bookingId);
    await addDoc(collection(db, INVOICE_COLLECTION), {
      bookingId,
      invoiceNumber: data.booking.invoiceNumber,
      customerId: data.customer.id,
      vendorId: data.vendor.id,
      totalAmount: data.pricing.totalPayable,
      pdfUrl,
      status: data.booking.status,
      source: 'share',
      createdAt: serverTimestamp(),
    });
    return { success: true, uri: shareUri, pdfUrl };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Invoice failed',
    };
  }
}

export { getOrCreateInvoiceNumberForBooking };
