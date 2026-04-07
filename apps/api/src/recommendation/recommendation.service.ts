import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RECOMMENDATION_REPOSITORY,
  type IRecommendationRepository,
} from './recommendation.repository.interface';
import { CatalogService } from '../catalog/catalog.service';
import { LlmService } from '../llm/llm.service';
import type { RecommendationResult } from '@chatbot-generator/shared-types';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recRepo: IRecommendationRepository,
    private readonly catalog: CatalogService,
    private readonly llm: LlmService,
  ) {}

  async recommend(
    userMessage: string,
    customerId: string,
    conversationId?: string,
  ): Promise<RecommendationResult | null> {
    // 1. Extract requirements via LLM
    const requirements = await this.llm.extractRequirements(userMessage);

    // 2. Query matching products
    const products = await this.catalog.listActive(requirements.category);

    if (products.length === 0) return null;

    // 3. Filter by budget if provided
    let candidates = products;
    if (requirements.budgetMax) {
      candidates = products.filter((p) => p.price <= requirements.budgetMax!);
      if (candidates.length === 0) candidates = products; // fallback to all
    }

    // 4. Sort by relevance (in-stock first, then by closest price)
    candidates.sort((a, b) => {
      if (a.stockQty > 0 && b.stockQty === 0) return -1;
      if (b.stockQty > 0 && a.stockQty === 0) return 1;
      return a.price - b.price;
    });

    const primary = candidates[0];
    const alternative = candidates.length > 1 ? candidates[1] : null;

    // 5. Generate explanation via LLM
    const explanation = await this.llm.explainRecommendation(
      userMessage,
      primary,
      alternative,
    );

    const result: RecommendationResult = {
      primaryProduct: {
        id: primary.id,
        name: primary.name,
        price: primary.price,
        stockQty: primary.stockQty,
        matchReason: 'Best match based on requirements and availability',
      },
      alternativeProduct: alternative
        ? {
            id: alternative.id,
            name: alternative.name,
            price: alternative.price,
            stockQty: alternative.stockQty,
            matchReason: 'Alternative option',
          }
        : null,
      explanation,
    };

    // 6. Save session
    await this.recRepo.create({
      customerId,
      conversationId,
      needSummary: userMessage,
      budget: requirements.budgetMax,
      preferredCategory: requirements.category,
      recommendedResult: result,
    });

    return result;
  }
}
