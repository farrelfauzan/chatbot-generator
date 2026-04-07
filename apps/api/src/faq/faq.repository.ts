import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IFaqRepository } from './faq.repository.interface';
import type {
  CreateFaqInput,
  UpdateFaqInput,
  FaqResponse,
  FaqQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class FaqRepository implements IFaqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FaqResponse | null> {
    return this.prisma.client.faqEntry.findUnique({ where: { id } });
  }

  async findAll(query?: FaqQuery): Promise<FaqResponse[]> {
    return this.prisma.client.faqEntry.findMany({
      where: {
        ...(query?.category ? { category: query.category } : {}),
        ...(query?.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: { question: 'asc' },
    });
  }

  async findActive(category?: string): Promise<FaqResponse[]> {
    return this.prisma.client.faqEntry.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
    });
  }

  async create(data: CreateFaqInput): Promise<FaqResponse> {
    return this.prisma.client.faqEntry.create({ data });
  }

  async update(id: string, data: UpdateFaqInput): Promise<FaqResponse> {
    return this.prisma.client.faqEntry.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.faqEntry.delete({ where: { id } });
  }
}
