import { Module } from '@nestjs/common';
import { EmbeddingProvider } from './embedding.provider';

@Module({
  providers: [EmbeddingProvider],
  exports: [EmbeddingProvider],
})
export class EmbeddingModule {}
