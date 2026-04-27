const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const PLATFORM_SCOPE = `
[CONNECTAI SCOPE — STRICT]
You are ConnectAI for StadiumConnect (India event marketplace). You ONLY help with StadiumConnect platform topics:
1) Vendor discovery: specific vendor dhundhna, category/city/rating/budget ke basis par shortlist banana, vendor compare karna.
2) Package planning: multi-vendor package suggestions with realistic estimates from provided app vendor data.
3) Booking guidance: booking flow, availability checks, payment stages, pending due, receipt/share flow, support/help center usage.
4) Product help: StadiumConnect app/website ke andar jo features hain unka user guidance.
If user asks ANYTHING outside StadiumConnect (sports/news/coding/politics/personal advice/other apps), politely refuse in 1-2 Hinglish lines and redirect to StadiumConnect need (city/category/booking issue/vendor type).
[END SCOPE]

`;

function extractRetrySeconds(message) {
  const m = String(message || '').match(/retry in\s+([\d.]+)s/i);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? Math.ceil(v) : null;
}

/**
 * Vercel serverless: ConnectAI proxy via OpenAI.
 * Set OPENAI_API_KEY in Vercel → Settings → Environment Variables.
 * Backward compatible: OPENAI_KEY also supported.
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

  const key = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim();
  if (!key) {
    return res
      .status(503)
      .json({ error: 'connectAI_not_configured', message: 'Server missing OPENAI_API_KEY (or OPENAI_KEY)' });
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

  const text = PLATFORM_SCOPE + prompt;

  return fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are ConnectAI for StadiumConnect. Help across all StadiumConnect features (vendors, packages, booking, payment, support) and reply in Hinglish. Stay strictly inside StadiumConnect scope.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature:
        typeof generationConfig.temperature === 'number'
          ? generationConfig.temperature
          : 0.35,
      max_tokens:
        typeof generationConfig.maxOutputTokens === 'number'
          ? generationConfig.maxOutputTokens
          : 1200,
    }),
  })
    .then((r) => r.json().then((data) => ({ r, data })))
    .then(({ r, data }) => {
      if (!r.ok) {
        const upstreamMsg = (data && data.error && data.error.message) || r.statusText || 'Upstream error';
        const low = String(upstreamMsg).toLowerCase();
        if (r.status === 401 || low.includes('invalid api key')) {
          return res.status(502).json({
            error: 'upstream_auth',
            message: 'OpenAI key invalid or expired. Update OPENAI_API_KEY in Vercel.',
          });
        }
        if (r.status === 429 || low.includes('quota exceeded') || low.includes('rate limit')) {
          const retrySeconds = extractRetrySeconds(upstreamMsg);
          const isBillingIssue =
            low.includes('insufficient_quota') ||
            low.includes('billing') ||
            low.includes('exceeded your current quota');
          return res.status(429).json({
            error: 'quota_exceeded',
            message: isBillingIssue
              ? 'OpenAI quota/billing issue hai. Vercel key check karo aur OpenAI billing enable karo.'
              : retrySeconds
                ? `ConnectAI abhi busy hai. ${retrySeconds} sec baad dobara try karein.`
                : 'ConnectAI abhi busy hai. Thodi der baad dobara try karein.',
          });
        }
        return res.status(502).json({
          error: 'upstream',
          message: upstreamMsg,
        });
      }
      const out =
        (data &&
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content) ||
        '';
      return res.json({ text: out });
    })
    .catch((e) => res.status(500).json({ error: 'internal', message: e.message || String(e) }));
}

module.exports = handler;
