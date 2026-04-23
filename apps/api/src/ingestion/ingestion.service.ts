import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmbeddingProvider } from '../embedding/embedding.provider';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingProvider,
  ) {}

  // ─── FAQ Ingestion ──────────────────────────────────

  async ingestFaqEntry(id: string): Promise<void> {
    const entry = await this.prisma.client.faqEntry.findUnique({
      where: { id },
    });
    if (!entry) return;

    const text = `${entry.question} ${entry.answer}`;
    const vector = await this.embedding.embedText(text);
    const embeddingStr = `[${vector.join(',')}]`;

    await this.prisma.client.$executeRaw`
      UPDATE "FaqEntry" SET embedding = ${embeddingStr}::vector WHERE id = ${id}`;

    // Also upsert into KnowledgeChunk
    await this.upsertKnowledgeChunk({
      sourceType: 'faq',
      sourceId: id,
      title: entry.question,
      content: `Q: ${entry.question}\nA: ${entry.answer}`,
      metadata: { category: entry.category },
      vector,
    });

    this.logger.log(`Ingested FAQ entry: ${id}`);
  }

  async ingestAllFaq(): Promise<number> {
    const entries = await this.prisma.client.faqEntry.findMany({
      where: { isActive: true },
    });

    const texts = entries.map((e) => `${e.question} ${e.answer}`);
    const vectors = await this.embedding.embedBatch(texts);

    for (let i = 0; i < entries.length; i++) {
      const embeddingStr = `[${vectors[i].join(',')}]`;
      await this.prisma.client.$executeRaw`
        UPDATE "FaqEntry" SET embedding = ${embeddingStr}::vector WHERE id = ${entries[i].id}`;

      await this.upsertKnowledgeChunk({
        sourceType: 'faq',
        sourceId: entries[i].id,
        title: entries[i].question,
        content: `Q: ${entries[i].question}\nA: ${entries[i].answer}`,
        metadata: { category: entries[i].category },
        vector: vectors[i],
      });
    }

    this.logger.log(`Ingested ${entries.length} FAQ entries`);
    return entries.length;
  }

  // ─── Knowledge Chunk Ingestion ──────────────────────

  async ingestKnowledgeChunk(data: {
    sourceType: string;
    sourceId?: string;
    title: string;
    content: string;
    metadata?: any;
  }): Promise<void> {
    const vector = await this.embedding.embedText(
      `${data.title} ${data.content}`,
    );

    await this.upsertKnowledgeChunk({
      sourceType: data.sourceType,
      sourceId: data.sourceId ?? null,
      title: data.title,
      content: data.content,
      metadata: data.metadata ?? null,
      vector,
    });
  }

  async ingestKnowledgeChunks(
    chunks: Array<{
      sourceType: string;
      sourceId?: string;
      title: string;
      content: string;
      metadata?: any;
    }>,
  ): Promise<number> {
    const texts = chunks.map((c) => `${c.title} ${c.content}`);
    const vectors = await this.embedding.embedBatch(texts);

    for (let i = 0; i < chunks.length; i++) {
      await this.upsertKnowledgeChunk({
        sourceType: chunks[i].sourceType,
        sourceId: chunks[i].sourceId ?? null,
        title: chunks[i].title,
        content: chunks[i].content,
        metadata: chunks[i].metadata ?? null,
        vector: vectors[i],
      });
    }

    this.logger.log(`Ingested ${chunks.length} knowledge chunks`);
    return chunks.length;
  }

  // ─── Reindex All ────────────────────────────────────

  async reindexAll(): Promise<{ faq: number; knowledge: number }> {
    const faqCount = await this.ingestAllFaq();

    // Re-embed all non-FAQ knowledge chunks
    const chunks = await this.prisma.client.knowledgeChunk.findMany({
      where: { isActive: true, sourceType: { not: 'faq' } },
    });

    const texts = chunks.map((c) => `${c.title} ${c.content}`);
    const vectors = await this.embedding.embedBatch(texts);

    for (let i = 0; i < chunks.length; i++) {
      const embeddingStr = `[${vectors[i].join(',')}]`;
      await this.prisma.client.$executeRaw`
        UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${chunks[i].id}`;
    }

    this.logger.log(`Reindexed all: ${faqCount} FAQ + ${chunks.length} chunks`);
    return { faq: faqCount, knowledge: chunks.length };
  }

  // ─── Private Helpers ────────────────────────────────

  private async upsertKnowledgeChunk(data: {
    sourceType: string;
    sourceId: string | null;
    title: string;
    content: string;
    metadata: any;
    vector: number[];
  }): Promise<void> {
    const embeddingStr = `[${data.vector.join(',')}]`;

    // Find existing chunk by sourceType + sourceId + title
    const existing = data.sourceId
      ? await this.prisma.client.knowledgeChunk.findFirst({
          where: {
            sourceType: data.sourceType,
            sourceId: data.sourceId,
          },
        })
      : await this.prisma.client.knowledgeChunk.findFirst({
          where: {
            sourceType: data.sourceType,
            title: data.title,
          },
        });

    if (existing) {
      await this.prisma.client.knowledgeChunk.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          content: data.content,
          metadata: data.metadata,
        },
      });
      await this.prisma.client.$executeRaw`
        UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${existing.id}`;
    } else {
      const created = await this.prisma.client.knowledgeChunk.create({
        data: {
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          title: data.title,
          content: data.content,
          metadata: data.metadata,
        },
      });
      await this.prisma.client.$executeRaw`
        UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${created.id}`;
    }
  }
}
