export type AIVendorFormInput = {
  budget: string;
  serviceType: string;
  location: string;
  eventType: string;
  specialRequirements: string;
};

export type AIVendorRecord = {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  minPrice?: number;
  maxPrice?: number;
  area?: string;
  city?: string;
  serviceType?: string;
  specialties?: string[];
  completedEvents?: number;
  photoURL?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type AIRecommendationItem = {
  vendorId: string;
  vendorName: string;
  rank: number;
  whyPicked: string;
  matchScore: number;
};

export type AIMyRecommendation = {
  vendorId: string;
  reason: string;
  tips: string;
};

export type AIGeminiResult = {
  recommendations: AIRecommendationItem[];
  myRecommendation: AIMyRecommendation;
  summary: string;
};
