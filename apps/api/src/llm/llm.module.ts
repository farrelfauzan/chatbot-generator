import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmProvider } from './llm.provider';
import { LlmService } from './llm.service';
import { PromptTemplateModule } from '../prompt-templates/prompt-template.module';

@Module({
  imports: [PromptTemplateModule],
  controllers: [LlmController],
  providers: [LlmProvider, LlmService],
  exports: [LlmProvider, LlmService],
})
export class LlmModule {}
