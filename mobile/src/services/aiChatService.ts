import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { getGeminiApiKey, GEMINI_GENERATE_URL } from '@/config/geminiConfig';
import type { AIVendorResultPayload, UserPreferences, Top3Item } from '@/types/aiChat';

const VENDORS = 'vendors';

/** Normalize quick-reply / chip text for DB matching (drop leading emoji) */
function stripEmojis(s: string): string {
  return s
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/^\s*📍\s*/u, '')
    .replace(/^\s*💰\s*/u, '')
    .replace(/^\s*📅\s*/u, '')
    .replace(/^\s*⭐\s*/u, '')
    .replace(/^\s*✨\s*/u, '')
    .replace(/^\s*✅\s*/u, '')
    .trim();
}

function normalizeCategory(raw: string): string {
  const s = stripEmojis(raw);
  if (/full event/i.test(s) || /package/i.test(s)) {
    return 'Full Event Package';
  }
  return s || raw;
}

function normalizeCity(raw: string): string {
  let s = stripEmojis(raw);
  if (/other/i.test(s) || /type/i.test(s)) {
    return '';
  }
  return s;
}

export function parseBudget(budget: string): number {
  const s = stripEmojis(budget).toLowerCase();
  if (s.includes('5l+') || s.includes('5l +')) {
    return 1e9;
  }
  if (s.includes('1l') && s.includes('5l')) {
    return 5_00_000;
  }
  if (s.includes('50k') && s.includes('1l')) {
    return 1_00_000;
  }
  if (s.includes('10k') && s.includes('50k')) {
    return 50_000;
  }
  if (s.includes('10,000') || s.includes('10000') || s.includes('under')) {
    return 10_000;
  }
  const m = s.match(/(\d+\.?\d*)\s*l/i);
  if (m) {
    return parseFloat(m[1]) * 1_00_000;
  }
  const k = s.match(/(\d+\.?\d*)\s*k/i);
  if (k) {
    return parseFloat(k[1]) * 1_000;
  }
  const num = s.match(/[\d,]+/);
  if (num) {
    return parseInt(num[0].replace(/,/g, ''), 10) || 5_00_000;
  }
  return 5_00_000;
}

export type FireVendor = {
  id: string;
  name?: string;
  category?: string;
  city?: string;
  area?: string;
  priceRange?: string;
  minPrice?: number;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  isActive?: boolean;
  photoURL?: string;
  imageUrl?: string;
};

function vendorRowMatches(
  d: FireVendor,
  prefs: UserPreferences,
  maxBudget: number
): boolean {
  if (d.isAvailable === false) {
    return false;
  }
  if (d.isActive === false) {
    return false;
  }
  const wantCat = normalizeCategory(prefs.category).toLowerCase();
  const vCat = (d.category || '').toLowerCase();
  if (wantCat && vCat) {
    if (!vCat.includes(wantCat) && !wantCat.includes(vCat) && !/full|package/i.test(prefs.category)) {
      if (!/full|package/i.test(wantCat)) {
        // allow if category string overlaps
        const ok =
          vCat.split(/\s+/).some((w) => w.length > 2 && wantCat.includes(w)) ||
          wantCat.split(/\s+/).some((w) => w.length > 2 && vCat.includes(w));
        if (!ok) {
          return false;
        }
      }
    }
  }
  const low = d.minPrice;
  if (typeof low === 'number' && low > maxBudget * 1.2) {
    return false;
  }
  if (!prefs.city.trim() || !normalizeCity(prefs.city)) {
    return true;
  }
  const want = normalizeCity(prefs.city).toLowerCase();
  const loc = (d.city || d.area || '').toLowerCase();
  if (!loc) {
    return true;
  }
  return loc.includes(want) || want.includes(loc);
}

export async function fetchVendorsFromFirestore(
  prefs: UserPreferences
): Promise<FireVendor[]> {
  const col = collection(db, VENDORS);
  const maxB = Math.max(parseBudget(prefs.budget), 0);
  const wantCat = normalizeCategory(prefs.category);
  const wantCity = normalizeCity(prefs.city);

  let list: FireVendor[] = [];
  try {
    const q = query(
      col,
      where('category', '==', wantCat),
      where('isAvailable', '==', true),
      limit(25)
    );
    const snap = await getDocs(q);
    list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FireVendor));
  } catch {
    /* fall through */ void 0;
  }
  if (list.length === 0) {
    try {
      const q2 = query(col, where('isAvailable', '==', true), limit(50));
      const snap2 = await getDocs(q2);
      list = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as FireVendor));
    } catch {
      try {
        const q3 = query(col, limit(50));
        const snap3 = await getDocs(q3);
        list = snap3.docs.map((d) => ({ id: d.id, ...d.data() } as FireVendor));
      } catch {
        return [];
      }
    }
  }

  if (wantCity) {
    const c = list.filter(
      (v) =>
        (v.city || v.area || '')
          .toLowerCase()
          .includes(wantCity.toLowerCase()) ||
        (v.city || v.area) === wantCity
    );
    if (c.length) {
      list = c;
    }
  }
  if (wantCat) {
    const c = list.filter(
      (v) =>
        (v.category || '').toLowerCase().includes(wantCat.toLowerCase()) ||
        wantCat.toLowerCase().includes((v.category || '').toLowerCase())
    );
    if (c.length) {
      list = c;
    }
  }

  return list
    .filter((v) => vendorRowMatches(v, prefs, maxB))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 15);
}

function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1) {
    throw new Error('No JSON in AI response');
  }
  return JSON.parse(cleaned.slice(first, last + 1));
}

export async function getAIRecommendations(
  prefs: UserPreferences,
  rawVendors: FireVendor[]
): Promise<AIVendorResultPayload> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_KEY');
  }
  const vendors = rawVendors.slice(0, 12).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    city: v.city || v.area,
    priceRange: v.priceRange,
    minPrice: v.minPrice,
    rating: v.rating,
    reviews: v.reviews ?? v.reviewCount,
    isAvailable: v.isAvailable,
    photoURL: v.photoURL || v.imageUrl,
  }));

  const prompt = `
You are a helpful Indian event planning assistant for StadiumConnect app.
Respond in Hinglish (mix of Hindi and English) to feel friendly and local.

USER WANTS:
- Service: ${prefs.category}
- City: ${prefs.city}  
- Budget: ${prefs.budget}
- Event Date: ${prefs.eventDate}
- Special Requirement: ${prefs.specialReq}

AVAILABLE VENDORS FROM DATABASE:
${JSON.stringify(vendors)}

Give response in this EXACT JSON format only, no extra text:
{
  "message": "Friendly 1-2 line intro message in Hinglish about results",
  "top3": [
    {
      "vendorId": "...",
      "vendorName": "...",
      "category": "...",
      "city": "...",
      "priceRange": "...",
      "rating": 4.5,
      "whyRecommend": "Short 1 line reason in Hinglish why this is good"
    }
  ],
  "myPick": {
    "vendorId": "...",
    "vendorName": "...",
    "reason": "2-3 line detailed reason in Hinglish - mention price value, rating, reliability",
    "tip": "One smart booking tip for the user"
  },
  "followUpQuestion": "Ask if they want to refine search or book directly"
}
`;

  const res = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || 'Gemini request failed');
  }
  const data = (await res.json()) as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty AI response');
  }
  const parsed = extractJsonObject(text) as {
    message: string;
    top3: Top3Item[];
    myPick: AIVendorResultPayload['myPick'];
    followUpQuestion: string;
  };
  return {
    message: parsed.message,
    top3: (parsed.top3 || []).map((t) => ({
      ...t,
      photoURL: rawVendors.find((v) => v.id === t.vendorId)?.photoURL,
    })),
    myPick: parsed.myPick,
    followUpQuestion: parsed.followUpQuestion,
    rawVendors: rawVendors as unknown as Record<string, unknown>[],
  };
}

const CHIP = /\[CHIP:\s*([^\]]+?)\]/g;

export type FreeChatResult = {
  text: string;
  chips: string[];
};

export async function runFreeFormChat(
  userText: string,
  prefs: UserPreferences,
  vendors: FireVendor[]
): Promise<FreeChatResult> {
  const key = getGeminiApiKey();
  if (!key) {
    return { text: 'Gemini key missing. Add EXPO_PUBLIC_GEMINI_KEY.', chips: [] };
  }
  const systemPrompt = `You are StadiumConnect's AI assistant. User is looking for event vendors in India.
Current context: ${JSON.stringify(prefs)}
Vendors in our database: ${JSON.stringify(
    vendors.slice(0, 15).map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      city: v.city,
      priceRange: v.priceRange,
      rating: v.rating,
    }))
  )}

Answer their question helpfully in Hinglish. 
If they ask about a specific vendor, provide details.
If they want to change preference, update and re-search.
Keep responses SHORT and conversational.
At the end, include 1-3 lines with optional quick actions in format: [CHIP: text]  for each action on its own.`;

  const res = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userText}` }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
    }),
  });
  if (!res.ok) {
    return { text: 'Network error, try again.', chips: [] };
  }
  const data = (await res.json()) as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const chips: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CHIP.source, 'g');
  while ((m = re.exec(text)) !== null) {
    chips.push(m[1].trim());
  }
  const clean = text.replace(CHIP, '').replace(/\n{3,}/g, '\n\n').trim();
  return { text: clean, chips };
}
