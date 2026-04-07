import { Module } from '@nestjs/common';
import { PromptTemplateController } from './prompt-template.controller';
import { PromptTemplateService } from './prompt-template.service';
import { PromptTemplateRepository } from './prompt-template.repository';
import { PROMPT_TEMPLATE_REPOSITORY } from './prompt-template.repository.interface';

@Module({
  controllers: [PromptTemplateController],
  providers: [
    PromptTemplateService,
    {
      provide: PROMPT_TEMPLATE_REPOSITORY,
      useClass: PromptTemplateRepository,
    },
  ],
  exports: [PromptTemplateService],
})
export class PromptTemplateModule {}
