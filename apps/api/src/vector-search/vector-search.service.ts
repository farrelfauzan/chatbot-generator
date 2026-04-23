import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmbeddingProvider } from '../embedding/embedding.provider';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  metadata: any;
  similarity: number;
}

export interface FaqSearchResult {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  similarity: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingProvider,
  ) {}

  async searchKnowledge(
    query: string,
    options?: { sourceType?: string; topK?: number; minSimilarity?: number },
  ): Promise<SearchResult[]> {
    const topK = options?.topK ?? 5;
    const minSimilarity = options?.minSimilarity ?? 0.3;

    const queryEmbedding = await this.embedding.embedText(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    let results: SearchResult[];

    if (options?.sourceType) {
      results = await this.prisma.client.$queryRaw<SearchResult[]>`
        SELECT id, title, content, "sourceType", "sourceId", metadata,
               1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM "KnowledgeChunk"
        WHERE "isActive" = true AND embedding IS NOT NULL
          AND "sourceType" = ${options.sourceType}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}`;
    } else {
      results = await this.prisma.client.$queryRaw<SearchResult[]>`
        SELECT id, title, content, "sourceType", "sourceId", metadata,
               1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM "KnowledgeChunk"
        WHERE "isActive" = true AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}`;
    }

    // Filter out low-relevance results
    return results.filter((r) => r.similarity >= minSimilarity);
  }

  async searchFaq(query: string, topK: number = 5): Promise<FaqSearchResult[]> {
    const queryEmbedding = await this.embedding.embedText(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    return this.prisma.client.$queryRaw<FaqSearchResult[]>`
      SELECT id, question, answer, category,
             1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM "FaqEntry"
      WHERE "isActive" = true AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}`;
  }
}
