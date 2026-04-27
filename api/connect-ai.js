const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const VENDOR_ONLY_SCOPE = `
[CONNECTAI SCOPE — STRICT]
You are ConnectAI for StadiumConnect (India event marketplace). You ONLY help with:
event vendors (decorator, caterer, photographer, venue, band, florist, etc.), Indian cities, budgets, wedding/birthday/corporate events, finding & comparing vendors, StadiumConnect booking flow, UPI on platform.
If the user asks ANYTHING else (sports, news, code, other apps, politics, personal advice), reply in 1–2 short lines in Hinglish: sorry, main sirf StadiumConnect vendors / event booking par baat kar sakta hoon — batao city ya category? Do NOT answer the off-topic request.
[END SCOPE]

`;

/**
 * Vercel serverless: ConnectAI proxy (no Firebase / Blaze). Set GEMINI_KEY in Vercel → Settings → Environment Variables.
 */
function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const key = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    return res
      .status(503)
      .json({ error: 'connectAI_not_configured', message: 'Server missing AI key' });
  }

  let body;
  try {
    body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (typeof body.prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required' });
  }
  const { prompt, generationConfig = {} } = body;
  if (prompt.length > 200000) {
    return res.status(400).json({ error: 'prompt too long' });
  }

  const text = VENDOR_ONLY_SCOPE + prompt;

  return fetch(GEMINI_URL, {
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
  })
    .then((r) => r.json().then((data) => ({ r, data })))
    .then(({ r, data }) => {
      if (!r.ok) {
        return res.status(502).json({
          error: 'upstream',
          message: (data && data.error && data.error.message) || r.statusText,
        });
      }
      const out = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
      return res.json({ text: out });
    })
    .catch((e) => res.status(500).json({ error: 'internal', message: e.message || String(e) }));
}

module.exports = handler;
