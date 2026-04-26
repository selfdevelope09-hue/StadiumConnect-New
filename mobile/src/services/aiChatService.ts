import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { getGeminiApiKey, GEMINI_GENERATE_URL } from '@/config/geminiConfig';

/** Aligned with AI chat modal flow (event type, not necessarily a date). */
export interface UserPreferences {
  category: string;
  city: string;
  budget: string;
  eventType: string;
  specialReq: string;
}

export interface VendorResult {
  vendorId: string;
  vendorName: string;
  rank: number;
  whyPicked: string;
  matchScore: number;
  priceRange: string;
  rating: number;
  city: string;
  category: string;
  image?: string;
}

export interface AIResponse {
  message: string;
  top3: VendorResult[];
  myPick: {
    vendorId: string;
    vendorName: string;
    reason: string;
    tip: string;
  };
  followUpQuestion: string;
}

export type FireVendor = {
  id: string;
  name?: string;
  category?: string;
  city?: string;
  area?: string;
  priceRange?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  reviewCount?: number;
  reviews?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  image?: string;
  imageUrl?: string;
  photoURL?: string;
};

export const PAYMENT_STAGES: Record<string, { stage: number; percent: number; label: string }[]> = {
  decorator: [
    { stage: 1, percent: 30, label: 'Booking Advance' },
    { stage: 2, percent: 50, label: 'Work Start' },
    { stage: 3, percent: 20, label: 'Final Payment' },
  ],
  photographer: [{ stage: 1, percent: 100, label: 'After Photo Delivery' }],
  caterer: [
    { stage: 1, percent: 50, label: 'Advance' },
    { stage: 2, percent: 50, label: 'Day of Event' },
  ],
  band_baja: [
    { stage: 1, percent: 40, label: 'Booking Token' },
    { stage: 2, percent: 60, label: 'Day of Event' },
  ],
  venue: [
    { stage: 1, percent: 25, label: 'Slot Booking' },
    { stage: 2, percent: 50, label: '1 Week Before' },
    { stage: 3, percent: 25, label: 'Final Settlement' },
  ],
};

function sortByRatingDesc<T extends { rating?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

/**
 * Fetches vendors for Gemini; tries common Firestore field combos (isActive / isAvailable, indexes).
 */
export const fetchVendorsFromFirestore = async (
  prefs: UserPreferences
): Promise<FireVendor[]> => {
  const cat = (prefs.category || '').trim() || 'caterer';
  const ref = collection(db, 'vendors');
  const attempts: (() => ReturnType<typeof query>)[] = [
    () =>
      query(
        ref,
        where('category', '==', cat),
        where('isActive', '==', true),
        orderBy('rating', 'desc'),
        limit(15)
      ),
    () => query(ref, where('category', '==', cat), where('isAvailable', '==', true), limit(25)),
    () => query(ref, where('category', '==', cat), where('isActive', '==', true), limit(25)),
    () => query(ref, where('isAvailable', '==', true), limit(30)),
  ];

  for (const build of attempts) {
    try {
      const snap = await getDocs(build());
      if (!snap.empty) {
        return sortByRatingDesc(
          snap.docs.map((d) => {
            const data = d.data() as Omit<FireVendor, 'id'>;
            return { ...data, id: d.id };
          })
        ).slice(0, 15);
      }
    } catch {
      /* try next */
    }
  }
  try {
    const snap = await getDocs(query(ref, limit(30)));
    const rows = snap.docs.map((d) => {
      const data = d.data() as Omit<FireVendor, 'id'>;
      return { ...data, id: d.id };
    });
    const c = cat.toLowerCase();
    const filtered = rows.filter(
      (r) => (r.category || '').toLowerCase().includes(c) || c.includes((r.category || '').toLowerCase())
    );
    return sortByRatingDesc((filtered.length ? filtered : rows).slice(0, 15));
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return [];
  }
};

export const callGeminiAI = async (
  prefs: UserPreferences,
  vendors: FireVendor[]
): Promise<AIResponse | null> => {
  const key = getGeminiApiKey();
  if (!key) {
    console.warn('Missing EXPO_PUBLIC_GEMINI_KEY');
    return null;
  }

  const prompt = `
You are a smart vendor recommendation AI for StadiumConnect app in India.
Respond in Hinglish (friendly mix of Hindi and English).

USER REQUIREMENTS:
- Service: ${prefs.category}
- City: ${prefs.city}
- Budget: ${prefs.budget}
- Event Type: ${prefs.eventType}
- Special Requirements: ${prefs.specialReq || 'None'}

AVAILABLE VENDORS:
${JSON.stringify(
  vendors.map((v) => ({
    id: v.id,
    name: v.name,
    rating: v.rating,
    reviewCount: v.reviewCount || v.reviews || 0,
    priceRange:
      v.priceRange ||
      (v.minPrice != null && v.maxPrice != null
        ? `${v.minPrice} - ${v.maxPrice}`
        : '—'),
    area: v.area || v.city,
    category: v.category,
    image: v.image || v.imageUrl || v.photoURL || null,
  })),
  null,
  2
)}

Return ONLY valid JSON, no extra text, no markdown:
{
  "message": "Friendly 1-2 line intro in Hinglish",
  "top3": [
    {
      "vendorId": "...",
      "vendorName": "...",
      "rank": 1,
      "whyPicked": "1 line reason in Hinglish",
      "matchScore": 95,
      "priceRange": "...",
      "rating": 4.5,
      "city": "...",
      "category": "..."
    }
  ],
  "myPick": {
    "vendorId": "...",
    "vendorName": "...",
    "reason": "2-3 line detailed reason in Hinglish",
    "tip": "One smart booking tip"
  },
  "followUpQuestion": "Short follow up question in Hinglish"
}`;

  try {
    const response = await fetch(GEMINI_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = (await response.json()) as {
      candidates?: { content: { parts: { text: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return null;
    }
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return JSON.parse(
      start >= 0 ? cleaned.slice(start, end + 1) : cleaned
    ) as AIResponse;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
};

export const callGeminiFreeChat = async (
  userMessage: string,
  prefs: UserPreferences,
  vendors: FireVendor[]
): Promise<{ reply: string; chips: string[] }> => {
  const key = getGeminiApiKey();
  if (!key) {
    return {
      reply: 'Gemini key missing. Set EXPO_PUBLIC_GEMINI_KEY in .env / EAS.',
      chips: ['OK'],
    };
  }
  const prompt = `
You are StadiumConnect's AI assistant. Answer in Hinglish only.
Current user context: ${JSON.stringify(prefs)}
Available vendors: ${JSON.stringify(vendors.slice(0, 8))}
User says: "${userMessage}"

Reply helpfully in 2-3 lines max.
End with chips in format: [CHIP:text] max 3 chips.
Example: [CHIP:Budget change karein] [CHIP:Doosra city] [CHIP:Book karo]
`;

  try {
    const response = await fetch(GEMINI_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = (await response.json()) as {
      candidates?: { content: { parts: { text: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const chips: string[] = [];
    const chipMatches = text.matchAll(/\[CHIP:([^\]]+)\]/g);
    for (const match of chipMatches) {
      chips.push(match[1].trim());
    }
    const reply = text.replace(/\[CHIP:[^\]]+\]/g, '').trim();
    return { reply, chips: chips.length ? chips : ['Theek hai'] };
  } catch {
    return {
      reply: 'Kuch issue aaya, please dobara try karo.',
      chips: ['Retry', 'Main menu'],
    };
  }
};
