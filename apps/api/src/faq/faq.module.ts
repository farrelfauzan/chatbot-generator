import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';
import { FAQ_REPOSITORY } from './faq.repository.interface';

@Module({
  controllers: [FaqController],
  providers: [FaqService, { provide: FAQ_REPOSITORY, useClass: FaqRepository }],
  exports: [FaqService],
})
export class FaqModule {}
