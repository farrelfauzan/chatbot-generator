import { Module } from '@nestjs/common';
import { IntentService } from './intent.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {}
