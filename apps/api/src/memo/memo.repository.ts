import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IMemoRepository,
  MemoRecord,
  MemoSearchResult,
} from './memo.repository.interface';

@Injectable()
export class MemoRepository implements IMemoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    customerId: string,
    content: string,
    options?: { title?: string; tags?: string[]; reminderAt?: Date },
  ): Promise<MemoRecord> {
    return this.prisma.client.memo.create({
      data: {
        customerId,
        content,
        title: options?.title || null,
        tags: options?.tags || [],
        reminderAt: options?.reminderAt || null,
      },
    });
  }

  async findByCustomer(customerId: string, take = 20): Promise<MemoRecord[]> {
    return this.prisma.client.memo.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async countByCustomer(customerId: string): Promise<number> {
    return this.prisma.client.memo.count({ where: { customerId } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.client.memo.delete({ where: { id } });
  }

  async searchSemantic(
    customerId: string,
    embedding: number[],
    limit = 5,
    threshold = 0.3,
  ): Promise<MemoSearchResult[]> {
    const embeddingStr = `[${embedding.join(',')}]`;
    const results = await this.prisma.client.$queryRaw<MemoSearchResult[]>`
      SELECT id, title, content,
             1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM "memos"
      WHERE "customerId" = ${customerId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}`;
    return results.filter((r) => r.similarity >= threshold);
  }

  async searchText(
    customerId: string,
    query: string,
    take = 5,
  ): Promise<MemoRecord[]> {
    return this.prisma.client.memo.findMany({
      where: {
        customerId,
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEmbedding(memoId: string, embedding: number[]): Promise<void> {
    const embeddingStr = `[${embedding.join(',')}]`;
    await this.prisma.client.$executeRaw`
      UPDATE "memos" SET embedding = ${embeddingStr}::vector WHERE id = ${memoId}`;
  }
}
