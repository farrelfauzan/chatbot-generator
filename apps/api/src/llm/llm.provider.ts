import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { appConfig } from '../app.config';

export interface ChatCompletionOptions {
  messages: ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  tools?: any[];
  toolChoice?: any;
}

export interface ChatCompletionResult {
  content: string | null;
  model: string;
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * OpenAI-compatible API provider.
 * Pure HTTP wrapper — no business logic.
 */
@Injectable()
export class LlmProvider {
  private readonly client = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
  });

  async chatCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    this.ensureApiKey();

    const completion = await this.client.chat.completions.create({
      model: appConfig.llm.model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? appConfig.llm.maxTokens,
      temperature: options.temperature ?? appConfig.llm.temperature,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
    });

    const choice = completion.choices[0];
    return {
      content: choice?.message?.content ?? null,
      model: completion.model ?? appConfig.llm.model,
      toolCalls: choice?.message?.tool_calls,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  getPublicConfig() {
    return {
      provider: appConfig.llm.provider,
      baseUrl: appConfig.llm.baseUrl,
      model: appConfig.llm.model,
      ready: Boolean(appConfig.llm.apiKey),
    };
  }

  private ensureApiKey(): void {
    if (!appConfig.llm.apiKey) {
      throw new ServiceUnavailableException('LLM_API_KEY is not configured.');
    }
  }
}
