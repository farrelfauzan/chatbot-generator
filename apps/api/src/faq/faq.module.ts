import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';
import { FAQ_REPOSITORY } from './faq.repository.interface';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [VectorSearchModule, IngestionModule],
  controllers: [FaqController],
  providers: [FaqService, { provide: FAQ_REPOSITORY, useClass: FaqRepository }],
  exports: [FaqService],
})
export class FaqModule {}
