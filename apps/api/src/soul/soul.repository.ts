import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ISoulRepository,
  CustomerProfile,
  PrayerReminderInfo,
  RecentMemo,
  PendingSchedule,
  MemoSearchResult,
} from './soul.repository.interface';

@Injectable()
export class SoulRepository implements ISoulRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerProfile(
    customerId: string,
  ): Promise<CustomerProfile | null> {
    return this.prisma.client.customer.findUnique({
      where: { id: customerId },
      select: {
        nickname: true,
        name: true,
        location: true,
        timezone: true,
        onboardingDone: true,
      },
    });
  }

  async getPrayerReminder(
    customerId: string,
  ): Promise<PrayerReminderInfo | null> {
    return this.prisma.client.prayerReminder.findUnique({
      where: { customerId },
      select: { location: true, prayers: true, isActive: true },
    });
  }

  async getMemoCount(customerId: string): Promise<number> {
    return this.prisma.client.memo.count({ where: { customerId } });
  }

  async getRecentMemos(customerId: string, take = 5): Promise<RecentMemo[]> {
    return this.prisma.client.memo.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, title: true, content: true, createdAt: true },
    });
  }

  async getPendingSchedules(
    customerId: string,
    take = 5,
  ): Promise<PendingSchedule[]> {
    return this.prisma.client.scheduledMessage.findMany({
      where: { customerId, status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
      take,
      select: { id: true, content: true, scheduledAt: true, targetName: true },
    });
  }

  async searchMemosBySimilarity(
    customerId: string,
    embedding: number[],
    limit = 5,
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
    return results.filter((m) => m.similarity >= 0.3);
  }
}
