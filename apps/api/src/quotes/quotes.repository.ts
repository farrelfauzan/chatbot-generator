import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IQuotesRepository,
  QuoteRecord,
} from './quotes.repository.interface';

@Injectable()
export class QuotesRepository implements IQuotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async count(category?: string): Promise<number> {
    const where = category ? { category } : {};
    return this.prisma.client.dailyQuote.count({ where });
  }

  async findOneByOffset(
    offset: number,
    category?: string,
  ): Promise<QuoteRecord | null> {
    const where = category ? { category } : {};
    return this.prisma.client.dailyQuote.findFirst({
      where,
      skip: offset,
      orderBy: { id: 'asc' },
    });
  }
}
