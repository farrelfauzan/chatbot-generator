import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { PromptTemplateModule } from '../prompt-templates/prompt-template.module';

@Module({
  imports: [PromptTemplateModule],
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
