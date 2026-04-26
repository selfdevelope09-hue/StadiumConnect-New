const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const USERS = 'users';
const NOTIF = 'notifications';

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
  PAYMENT_RECEIVED: (d) => ({
    title: 'Tranche received',
    body: `Stage ${d.stage}: ₹${d.amount} · ${d.bookingId || ''}`,
  }),
  PAYMENT_CONFIRMED: (d) => ({
    title: 'Payment confirmed',
    body: `Next: ${d.nextStage || ''} · ${d.bookingId || ''}`,
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
