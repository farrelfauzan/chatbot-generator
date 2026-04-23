import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PromptTemplateService } from '../prompt-templates/prompt-template.service';
import { LlmProvider } from './llm.provider';
import type {
  GroundedContext,
  IntentClassification,
} from '@chatbot-generator/shared-types';
import { CHAT_INTENTS } from '@chatbot-generator/shared-types';
import { appConfig } from '../app.config';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly provider: LlmProvider,
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplateService,
  ) {}

  getPublicConfig() {
    return this.provider.getPublicConfig();
  }

  async complete(message: string) {
    if (!message.trim()) throw new Error('Message is required.');

    const result = await this.provider.chatCompletion({
      messages: [{ role: 'user', content: message }],
    });

    await this.logLlmCall(null, null, message, result.content || '');

    return {
      provider: appConfig.llm.provider,
      model: result.model,
      content: result.content || '',
    };
  }

  async classifyIntent(
    message: string,
    conversationStage: string,
  ): Promise<IntentClassification> {
    const intentsJoined = CHAT_INTENTS.join(', ');

    const fallbackPrompt = `You are an intent classifier for a WhatsApp sales chatbot.
Given the user message and current conversation stage, classify the intent and extract relevant entities.

## Valid intents
${intentsJoined}

## Current conversation stage: {{conversationStage}}

## Rules
- Consider the conversation stage when the message is ambiguous
- During pricing or order_confirm stage, if the user sends ANY short affirmative, confirmatory, or continuation message (e.g. "ok", "oke", "ya", "yep", "yes", "sure", "boleh", "jadi", "lanjut", "siap", "gas", "deal", "ayo", "yuk", "mau", "bisa", thumbs up, or similar), classify as create_order
- During pricing or order_confirm stage, if the user sends product references by number (e.g. "3 dan 8", "nomor 2", "yang pertama") or product names, classify as create_order
- Language may be Indonesian, English, or mixed
- Respond ONLY with a JSON object, no other text

## Response format
{"intent": "<intent>", "entities": {"product_name": null, "budget": null, "quantity": null, "order_number": null, "use_case": null}, "confidence": 0.0}`;

    const systemPrompt = await this.promptTemplates.resolve(
      'intent-classification',
      { validIntents: intentsJoined, conversationStage },
      fallbackPrompt.replace('{{conversationStage}}', conversationStage),
    );

    const result = await this.provider.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      maxTokens: 200,
      temperature: 0.1,
    });

    const raw = result.content?.trim() ?? '';
    await this.logLlmCall(null, null, `[INTENT] ${message}`, raw);

    try {
      const parsed = JSON.parse(raw);
      return {
        intent: CHAT_INTENTS.includes(parsed.intent)
          ? parsed.intent
          : 'general_qa',
        entities: parsed.entities ?? {},
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch {
      this.logger.warn(`Failed to parse intent JSON: ${raw}`);
      return { intent: 'general_qa', confidence: 0.5 };
    }
  }

  async generateGroundedReply(
    userMessage: string,
    context: GroundedContext,
  ): Promise<string> {
    const fallbackPrompt = `You are a WhatsApp sales assistant.

RULES:
- Answer ONLY using the product data and facts provided below.
- NEVER invent stock quantities, prices, or order statuses.
- If you don't know, say you'll check with the team.
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Use friendly, professional Indonesian or English depending on customer language.
- Format prices as "Rp" with thousand separators.

CONVERSATION STAGE: {{conversationStage}}
CUSTOMER: {{customerName}}

PRODUCT DATA:
{{products}}

FAQ DATA:
{{faq}}

{{orderContext}}`;

    const systemPrompt = await this.promptTemplates.resolve(
      'grounded-reply',
      {
        conversationStage: context.conversationStage ?? '',
        customerName: context.customerName ?? 'Customer',
        products: JSON.stringify(context.products ?? [], null, 2),
        faq: JSON.stringify(context.faq ?? [], null, 2),
        orderContext: context.orderContext
          ? `ORDER CONTEXT:\n${JSON.stringify(context.orderContext, null, 2)}`
          : '',
      },
      fallbackPrompt,
    );

    const result = await this.provider.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const content = result.content || '';
    await this.logLlmCall(null, null, `[GROUNDED] ${userMessage}`, content);
    return content;
  }

  private async logLlmCall(
    conversationId: string | null,
    messageId: string | null,
    promptSummary: string,
    responseSummary: string,
  ): Promise<void> {
    try {
      await this.prisma.client.llmLog.create({
        data: {
          conversationId,
          messageId,
          model: appConfig.llm.model,
          promptSummary: promptSummary.substring(0, 500),
          responseSummary: responseSummary.substring(0, 500),
        },
      });
    } catch (err) {
      this.logger.warn('Failed to log LLM call', err);
    }
  }
}
