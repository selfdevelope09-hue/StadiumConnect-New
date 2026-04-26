const functions = require('firebase-functions');
const admin = require('firebase-admin');

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Prepended to every web request — model must stay on StadiumConnect / vendors only. */
const VENDOR_ONLY_SCOPE = `
[CONNECTAI SCOPE — STRICT]
You are ConnectAI for StadiumConnect (India event marketplace). You ONLY help with:
event vendors (decorator, caterer, photographer, venue, band, florist, etc.), Indian cities, budgets, wedding/birthday/corporate events, finding & comparing vendors, StadiumConnect booking flow, UPI on platform.
If the user asks ANYTHING else (sports, news, code, other apps, politics, personal advice), reply in 1–2 short lines in Hinglish: sorry, main sirf StadiumConnect vendors / event booking par baat kar sakta hoon — batao city ya category? Do NOT answer the off-topic request.
[END SCOPE]

`;

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

/**
 * Public HTTPS proxy for ConnectAI (web) — API key stays server-side.
 * Set: firebase functions:config:set gemini.key="YOUR_GOOGLE_AI_KEY"
 * Or env GEMINI_KEY / GEMINI_API_KEY in Cloud Run / 2nd gen (see Firebase docs).
 */
exports.connectAI = functions.region('us-central1').https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  let key =
    process.env.GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    (functions.config().gemini && functions.config().gemini.key) ||
    '';

  if (typeof key !== 'string' || !key.trim()) {
    return res
      .status(503)
      .json({ error: 'connectAI_not_configured', message: 'Server missing AI key' });
  }
  key = key.trim();

  const body = req.body;
  if (!body || typeof body.prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required' });
  }
  const { prompt, generationConfig = {} } = body;
  if (prompt.length > 200000) {
    return res.status(400).json({ error: 'prompt too long' });
  }

  const text = VENDOR_ONLY_SCOPE + prompt;
  try {
    const r = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1200,
          ...generationConfig,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({
        error: 'upstream',
        message: data.error?.message || r.statusText,
      });
    }
    const out =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text: out });
  } catch (e) {
    return res.status(500).json({ error: 'internal', message: e.message || String(e) });
  }
});
