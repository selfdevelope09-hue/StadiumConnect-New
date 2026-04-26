const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const BOOKINGS = 'bookings';
const USERS = 'users';
const NOTIF = 'notifications';

/**
 * Env (Firebase runtime config or Cloud Console):
 *   razorpay.key_id, razorpay.key_secret, razorpay.webhook_secret
 * Or process.env in .env (emulator) / Secret Manager
 */
function getRazorpay() {
  // eslint-disable-next-line global-require
  const Razorpay = require('razorpay');
  const key_id =
    process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id;
  const key_secret =
    process.env.RAZORPAY_SECRET || functions.config().razorpay?.key_secret;
  if (!key_id || !key_secret) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Set RAZORPAY_KEY_ID and RAZORPAY_SECRET (or firebase functions:config:set razorpay).'
    );
  }
  return new Razorpay({ key_id, key_secret });
}

exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  const { amount, currency, receipt, notes } = data;
  if (!amount || !currency) {
    throw new functions.https.HttpsError('invalid-argument', 'amount and currency required');
  }
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: Math.round(Number(amount)),
    currency: String(currency),
    receipt: receipt || `sc_${Date.now()}`,
    notes: notes && typeof notes === 'object' ? notes : {},
  });
  return order;
});

const templates = {
  BOOKING_CONFIRMED: (d) => ({
    title: 'Booking confirmed',
    body: `${d.vendorName || 'Vendor'} — booking is live.`,
  }),
  BOOKING_CANCELLED: () => ({ title: 'Booking cancelled', body: 'A booking was cancelled.' }),
  PAYMENT_SUCCESS: (d) => ({
    title: 'Payment successful',
    body: `₹${d.amount} received. ID: ${d.bookingId || ''}`,
  }),
  PAYMENT_FAILED: () => ({ title: 'Payment failed', body: 'Please try again or use another method.' }),
  VENDOR_ACCEPTED: (d) => ({
    title: 'Request accepted',
    body: `${d.vendorName || 'Vendor'} accepted your request.`,
  }),
  VENDOR_REJECTED: (d) => ({
    title: 'Request update',
    body: `${d.vendorName || 'Vendor'} could not take this one.`,
  }),
  NEW_BOOKING_REQUEST: (d) => ({
    title: 'New booking request',
    body: `${d.userName || 'Customer'} — ₹${d.amount} · ${d.eventDate || ''}`,
  }),
  REVIEW_RECEIVED: (d) => ({ title: 'New review', body: String(d.body || 'Someone left a review.') }),
  PAYOUT_PROCESSED: (d) => ({
    title: 'Payout done',
    body: `₹${d.amount} sent to your account.`,
  }),
  PROMOTIONAL: (d) => ({ title: String(d.title || 'StadiumConnect'), body: String(d.body || '') }),
};

/**
 * onCall { toUserId, type, data }
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  const { toUserId, type, data: notifData = {} } = data;
  if (!toUserId || !type) {
    throw new functions.https.HttpsError('invalid-argument', 'toUserId and type required');
  }
  const template = templates[type];
  if (!template) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown type');
  }
  const { title, body } = template(notifData);
  const userDoc = await db.collection(USERS).doc(String(toUserId)).get();
  const token = userDoc.data()?.expoPushToken;
  if (token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: { type, ...notifData },
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });
  }
  await db.collection(NOTIF).add({
    userId: String(toUserId),
    type,
    title,
    body,
    data: notifData,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/**
 * Webhook: configure URL in Razorpay dashboard, use `req.rawBody` for signature.
 * Secret: RAZORPAY_WEBHOOK_SECRET or functions.config().razorpay.webhook_secret
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    functions.config().razorpay?.webhook_secret;
  if (!secret) {
    res.status(500).json({ error: 'webhook secret not set' });
    return;
  }
  const body = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(body);
  const digest = shasum.digest('hex');
  if (digest !== req.headers['x-razorpay-signature']) {
    res.status(400).json({ error: 'invalid signature' });
    return;
  }
  let payload;
  try {
    payload = JSON.parse((body && body.toString && body.toString('utf8')) || '{}');
  } catch {
    res.status(400).json({ error: 'invalid json' });
    return;
  }
  const ent = payload?.payload?.payment?.entity;
  if (ent && ent.order_id) {
    const snap = await db
      .collection(BOOKINGS)
      .where('orderIdRzp', '==', ent.order_id)
      .limit(1)
      .get();
    if (!snap.empty) {
      const ref = snap.docs[0].ref;
      await ref.update({ status: 'paid', paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      const s2 = await db
        .collection(BOOKINGS)
        .where('orderId', '==', ent.order_id)
        .limit(1)
        .get();
      if (!s2.empty) {
        await s2.docs[0].ref.update({
          status: 'paid',
          paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
  res.json({ status: 'ok' });
});
