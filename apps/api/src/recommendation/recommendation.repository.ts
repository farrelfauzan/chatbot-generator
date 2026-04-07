import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IRecommendationRepository,
  RecommendationSessionData,
} from './recommendation.repository.interface';

@Injectable()
export class RecommendationRepository implements IRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RecommendationSessionData): Promise<{ id: string }> {
    return this.prisma.client.recommendationSession.create({
      data: {
        customerId: data.customerId,
        conversationId: data.conversationId,
        needSummary: data.needSummary,
        budget: data.budget,
        urgency: data.urgency,
        preferredCategory: data.preferredCategory,
        recommendedResult: data.recommendedResult as any,
      },
    });
  }
}
