import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { appConfig } from '../app.config';
import { PrismaService } from '../database/prisma.service';
import { PromptTemplateService } from '../prompt-templates/prompt-template.service';
import type {
  GroundedContext,
  IntentClassification,
  RecommendationRequest,
} from '@chatbot-generator/shared-types';
import { CHAT_INTENTS } from '@chatbot-generator/shared-types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private readonly client = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplateService,
  ) {}

  getPublicConfig() {
    return {
      provider: appConfig.llm.provider,
      baseUrl: appConfig.llm.baseUrl,
      model: appConfig.llm.model,
      ready: Boolean(appConfig.llm.apiKey),
    };
  }

  // ─── Simple chat (kept for backward compat) ───────

  async complete(message: string) {
    if (!message.trim()) {
      throw new BadRequestException('Message is required.');
    }
    this.ensureApiKey();

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: [{ role: 'user', content: message }],
      max_tokens: appConfig.llm.maxTokens,
      temperature: appConfig.llm.temperature,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    await this.logLlmCall(null, null, message, content);

    return {
      provider: appConfig.llm.provider,
      model: completion.model ?? appConfig.llm.model,
      content,
    };
  }

  // ─── Intent Classification ──────────────────────────

  async classifyIntent(
    message: string,
    conversationStage: string,
  ): Promise<IntentClassification> {
    this.ensureApiKey();

    const intentsJoined = CHAT_INTENTS.join(', ');

    const fallbackPrompt = `You are an intent classifier for a WhatsApp sales chatbot.
Given the user message and current conversation stage, classify the intent and extract relevant entities.

## Valid intents
${intentsJoined}

## Current conversation stage: {{conversationStage}}

## Rules
- Consider the conversation stage when the message is ambiguous
- For short affirmative messages ("ok", "oke", "jadi", "lanjut") during pricing/order_confirm stage, classify as create_order
- Language may be Indonesian, English, or mixed
- Respond ONLY with a JSON object, no other text

## Response format
{"intent": "<intent>", "entities": {"product_name": null, "budget": null, "quantity": null, "order_number": null, "use_case": null}, "confidence": 0.0}`;

    const systemPrompt = await this.promptTemplates.resolve(
      'intent-classification',
      {
        validIntents: intentsJoined,
        conversationStage,
      },
      fallbackPrompt.replace('{{conversationStage}}', conversationStage),
    );

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';

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

  // ─── Grounded Reply ─────────────────────────────────

  async generateGroundedReply(
    userMessage: string,
    context: GroundedContext,
  ): Promise<string> {
    this.ensureApiKey();

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

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: appConfig.llm.maxTokens,
      temperature: appConfig.llm.temperature,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    await this.logLlmCall(null, null, `[GROUNDED] ${userMessage}`, content);

    return content;
  }

  // ─── Requirement Extraction ─────────────────────────

  async extractRequirements(
    userMessage: string,
  ): Promise<RecommendationRequest> {
    this.ensureApiKey();

    const fallbackPrompt = `Extract product requirements from the user message.
Respond ONLY with a JSON object:
{"category": "string or null", "budgetMax": number or null, "quantity": number or null, "useCase": "string or null", "specs": {}}

Do not include any other text.`;

    const systemPrompt = await this.promptTemplates.resolve(
      'requirement-extraction',
      {},
      fallbackPrompt,
    );

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';

    await this.logLlmCall(null, null, `[EXTRACT] ${userMessage}`, raw);

    try {
      const parsed = JSON.parse(raw);
      return {
        category: parsed.category ?? undefined,
        budgetMax:
          typeof parsed.budgetMax === 'number' ? parsed.budgetMax : undefined,
        quantity:
          typeof parsed.quantity === 'number' ? parsed.quantity : undefined,
        useCase: parsed.useCase ?? undefined,
        specs: parsed.specs ?? undefined,
      };
    } catch {
      this.logger.warn(`Failed to parse requirements JSON: ${raw}`);
      return {};
    }
  }

  // ─── Recommendation Explanation ─────────────────────

  async explainRecommendation(
    userMessage: string,
    primaryProduct: { name: string; price: number; stockQty: number },
    alternativeProduct: {
      name: string;
      price: number;
      stockQty: number;
    } | null,
  ): Promise<string> {
    this.ensureApiKey();

    const fallbackPrompt = `You are a WhatsApp sales assistant helping a customer choose a product.
Based on the customer's request and the matched products, write a friendly recommendation in Indonesian.
Keep it concise (max 2 paragraphs). Format prices as "Rp" with thousand separators.
NEVER invent data — only use the product info provided.

PRIMARY PRODUCT: {{primaryProduct}}
{{alternativeProduct}}`;

    const systemPrompt = await this.promptTemplates.resolve(
      'recommendation-explanation',
      {
        primaryProduct: JSON.stringify(primaryProduct),
        alternativeProduct: alternativeProduct
          ? `ALTERNATIVE: ${JSON.stringify(alternativeProduct)}`
          : 'No alternative available.',
      },
      fallbackPrompt,
    );

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: appConfig.llm.maxTokens,
      temperature: appConfig.llm.temperature,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    await this.logLlmCall(null, null, `[RECOMMEND] ${userMessage}`, content);

    return content;
  }

  // ─── Helpers ────────────────────────────────────────

  private ensureApiKey(): void {
    if (!appConfig.llm.apiKey) {
      throw new ServiceUnavailableException('LLM_API_KEY is not configured.');
    }
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
