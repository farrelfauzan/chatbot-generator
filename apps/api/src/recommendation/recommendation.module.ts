import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationRepository } from './recommendation.repository';
import { RECOMMENDATION_REPOSITORY } from './recommendation.repository.interface';
import { CatalogModule } from '../catalog/catalog.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [CatalogModule, LlmModule],
  providers: [
    RecommendationService,
    { provide: RECOMMENDATION_REPOSITORY, useClass: RecommendationRepository },
  ],
  exports: [RecommendationService],
})
export class RecommendationModule {}
