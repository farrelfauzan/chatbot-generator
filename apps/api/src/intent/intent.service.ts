import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type { IntentClassification } from '@chatbot-generator/shared-types';

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(private readonly llm: LlmService) {}

  async classify(
    message: string,
    conversationStage: string,
  ): Promise<IntentClassification> {
    try {
      const result = await this.llm.classifyIntent(message, conversationStage);
      this.logger.debug(
        `Intent: "${result.intent}" (${result.confidence}) for "${message}"`,
      );
      return result;
    } catch (err) {
      this.logger.warn(
        'LLM intent classification failed, defaulting to general_qa',
        err,
      );
      return { intent: 'general_qa', confidence: 0.5 };
    }
  }
}
