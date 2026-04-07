import type { RecommendationResult } from '@chatbot-generator/shared-types';

export const RECOMMENDATION_REPOSITORY = 'IRecommendationRepository';

export interface RecommendationSessionData {
  customerId: string;
  conversationId?: string;
  needSummary?: string;
  budget?: number;
  urgency?: string;
  preferredCategory?: string;
  recommendedResult?: unknown;
}

export interface IRecommendationRepository {
  create(data: RecommendationSessionData): Promise<{ id: string }>;
}
