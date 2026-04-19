import { Module } from '@nestjs/common';
import { VectorSearchService } from './vector-search.service';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  providers: [VectorSearchService],
  exports: [VectorSearchService],
})
export class VectorSearchModule {}
