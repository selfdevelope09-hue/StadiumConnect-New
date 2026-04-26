import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { getGeminiApiKey, GEMINI_GENERATE_URL } from '@/config/geminiConfig';
import type {
  AIGeminiResult,
  AIVendorFormInput,
  AIVendorRecord,
} from '@/types/aiVendor';

const VENDORS = 'vendors';
const MAX_VENDOR_DOCS = 15;

function parseBudgetInput(b: string): number {
  const cleaned = b.replace(/[₹,\s]/g, '');
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((p) => parseFloat(p.trim()));
    return Math.max(...parts.filter((n) => !Number.isNaN(n)), 0);
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[₹,\s]/g, ''));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function recordMatchesService(v: AIVendorRecord, serviceType: string): boolean {
  const s = (v.serviceType || (v as { category?: string }).category || '')
    .toString()
    .toLowerCase();
  return !serviceType || s === serviceType.toLowerCase() || s.includes(serviceType.toLowerCase());
}

function recordMatchesLocation(v: AIVendorRecord, location: string): boolean {
  if (!location.trim()) {
    return true;
  }
  const loc = location.toLowerCase().trim();
  const area = (v.area || v.city || '').toString().toLowerCase();
  if (!area) {
    return true;
  }
  return area.includes(loc) || loc.includes(area) || area.split(/\s+/).some((w) => w.length > 2 && loc.includes(w));
}

function recordWithinBudget(v: AIVendorRecord, budget: number): boolean {
  if (budget <= 0) {
    return true;
  }
  const minP = toNumber(v.minPrice);
  if (minP != null) {
    return minP <= budget;
  }
  // Parse something like "₹5,000 - ₹20,000"
  if (v.priceRange) {
    const nums = (v.priceRange as string).match(/[\d,]+/g);
    if (nums?.length) {
      const first = parseFloat(nums[0].replace(/,/g, ''));
      if (!Number.isNaN(first)) {
        return first <= budget;
      }
    }
  }
  return true;
}

/**
 * Fetches from Firestore and applies strict filters in memory to avoid
 * multi-field composite index requirements in early deployments.
 */
export async function fetchFilteredVendors(
  serviceType: string,
  location: string,
  budget: number
): Promise<AIVendorRecord[]> {
  const vendorsRef = collection(db, VENDORS);
  let snapshot;
  try {
    const q = query(
      vendorsRef,
      where('isActive', '==', true),
      where('serviceType', '==', serviceType),
      limit(50)
    );
    snapshot = await getDocs(q);
  } catch {
    try {
      const q2 = query(
        vendorsRef,
        where('serviceType', '==', serviceType),
        limit(50)
      );
      snapshot = await getDocs(q2);
    } catch {
      const q3 = query(vendorsRef, limit(50));
      snapshot = await getDocs(q3);
    }
  }

  const raw = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as AIVendorRecord[];

  const filtered = raw
    .filter((v) => recordMatchesService(v, serviceType))
    .filter((v) => (v as { isActive?: boolean }).isActive !== false)
    .filter((v) => recordWithinBudget(v, budget))
    .filter((v) => recordMatchesLocation(v, location));

  filtered.sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) {
      return rb - ra;
    }
    return (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
  });

  return filtered.slice(0, MAX_VENDOR_DOCS);
}

const buildGeminiPrompt = (userInput: AIVendorFormInput, vendors: AIVendorRecord[]) => `
You are a smart vendor recommendation AI for StadiumConnect app in India.

USER REQUIREMENTS:
- Budget: ₹${userInput.budget}
- Service Needed: ${userInput.serviceType}
- Location: ${userInput.location}
- Event Type: ${userInput.eventType}
- Special Requirements: ${userInput.specialRequirements || 'None'}

AVAILABLE VENDORS (from our database):
${JSON.stringify(
  vendors.map((v) => ({
    id: v.id,
    name: v.name,
    rating: v.rating,
    reviewCount: v.reviewCount,
    priceRange: v.priceRange,
    minPrice: v.minPrice,
    area: v.area,
    specialties: v.specialties,
    completedEvents: v.completedEvents,
  })),
  null,
  2
)}

TASK: Analyze all vendors and return ONLY a JSON response (no extra text) in this exact format:
{
  "recommendations": [
    {
      "vendorId": "...",
      "vendorName": "...",
      "rank": 1,
      "whyPicked": "Best value for ₹X budget with 4.8 rating and 200+ events",
      "matchScore": 95
    },
    {
      "vendorId": "...",
      "vendorName": "...",
      "rank": 2,
      "whyPicked": "...",
      "matchScore": 88
    },
    {
      "vendorId": "...",
      "vendorName": "...",
      "rank": 3,
      "whyPicked": "...",
      "matchScore": 82
    }
  ],
  "myRecommendation": {
    "vendorId": "...",
    "reason": "Detailed 2-3 line explanation of why this is the absolute best choice considering budget, rating, reviews, location proximity, and specialties",
    "tips": "Negotiation tip or booking tip for the user"
  },
  "summary": "One line summary of the search results"
}
`;

async function callGeminiAI(
  prompt: string,
  apiKey: string
): Promise<unknown> {
  const response = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `Gemini HTTP ${response.status}`);
  }
  const data = (await response.json()) as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response from AI. Try different filters or try again.');
  }
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) {
    throw new Error('Could not parse AI response as JSON');
  }
  return JSON.parse(cleaned.slice(first, last + 1)) as AIGeminiResult;
}

export type AIFlowResult = {
  success: true;
  data: AIGeminiResult;
  vendorsUsed: AIVendorRecord[];
} | {
  success: false;
  error: string;
  vendorsUsed: AIVendorRecord[];
};

export async function getAIVendorRecommendations(
  userInput: AIVendorFormInput
): Promise<AIFlowResult> {
  const key = getGeminiApiKey();
  if (!key) {
    return {
      success: false,
      error:
        'Set EXPO_PUBLIC_GEMINI_KEY in .env (or EAS) — see app.config.ts extra.',
      vendorsUsed: [],
    };
  }
  const budget = parseBudgetInput(userInput.budget);
  if (!userInput.serviceType?.trim()) {
    return {
      success: false,
      error: 'Please choose a service type.',
      vendorsUsed: [],
    };
  }

  const vendors = await fetchFilteredVendors(
    userInput.serviceType,
    userInput.location,
    budget
  );
  if (vendors.length === 0) {
    return {
      success: false,
      error: 'No vendors found for this budget, service, and area. Try widening your budget or location.',
      vendorsUsed: [],
    };
  }
  const prompt = buildGeminiPrompt(userInput, vendors);
  try {
    const parsed = (await callGeminiAI(
      prompt,
      key
    )) as AIGeminiResult;
    if (!parsed.recommendations?.length) {
      return {
        success: false,
        error: 'The AI could not build recommendations. Please try again.',
        vendorsUsed: vendors,
      };
    }
    return { success: true, data: parsed, vendorsUsed: vendors };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed';
    return { success: false, error: message, vendorsUsed: vendors };
  }
}
