import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { SoulService } from './soul.service';
import { SoulRepository } from './soul.repository';
import { SOUL_REPOSITORY } from './soul.repository.interface';

@Module({
  imports: [EmbeddingModule],
  providers: [
    { provide: SOUL_REPOSITORY, useClass: SoulRepository },
    SoulService,
  ],
  exports: [SoulService],
})
export class SoulModule {}
