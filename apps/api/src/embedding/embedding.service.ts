import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { appConfig } from '../app.config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private readonly client = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
  });

  private readonly model = 'text-embedding-3-small';

  async embedText(text: string): Promise<number[]> {
    if (!appConfig.llm.apiKey) {
      throw new ServiceUnavailableException('LLM_API_KEY is not configured.');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text.substring(0, 8000), // safeguard against token limit
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!appConfig.llm.apiKey) {
      throw new ServiceUnavailableException('LLM_API_KEY is not configured.');
    }

    if (texts.length === 0) return [];

    // OpenAI supports up to 2048 inputs per batch
    const batchSize = 2048;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts
        .slice(i, i + batchSize)
        .map((t) => t.substring(0, 8000));

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      for (const item of response.data) {
        results.push(item.embedding);
      }
    }

    return results;
  }
}
