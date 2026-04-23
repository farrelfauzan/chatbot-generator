import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { MemoService } from './memo.service';
import { MemoRepository } from './memo.repository';
import { MEMO_REPOSITORY } from './memo.repository.interface';

@Module({
  imports: [EmbeddingModule],
  providers: [
    { provide: MEMO_REPOSITORY, useClass: MemoRepository },
    MemoService,
  ],
  exports: [MemoService],
})
export class MemoModule {}
