export type ChatStep =
  | 'category'
  | 'city'
  | 'budget'
  | 'date'
  | 'extras'
  | 'results'
  | 'freeChat';

export type UserPreferences = {
  category: string;
  city: string;
  budget: string;
  eventDate: string;
  specialReq: string;
};

export type TextMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

export type TypingKey = { id: 'typing'; kind: 'typing' };

export type ResultMessage = {
  id: string;
  role: 'results';
  data: AIVendorResultPayload;
};

export type Message = TextMessage | ResultMessage;

export type Top3Item = {
  vendorId: string;
  vendorName: string;
  category: string;
  city: string;
  priceRange: string;
  rating: number;
  whyRecommend: string;
  photoURL?: string;
  reviews?: number;
};

export type AIVendorResultPayload = {
  message: string;
  top3: Top3Item[];
  myPick: {
    vendorId: string;
    vendorName: string;
    reason: string;
    tip: string;
  };
  followUpQuestion: string;
  rawVendors?: Record<string, unknown>[];
};
