import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ICategoryRepository } from './category.repository.interface';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResponse,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryResponse[]> {
    return this.prisma.client.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<CategoryResponse | null> {
    return this.prisma.client.category.findUnique({ where: { id } });
  }

  async create(data: CreateCategoryInput): Promise<CategoryResponse> {
    return this.prisma.client.category.create({ data });
  }

  async update(
    id: string,
    data: UpdateCategoryInput,
  ): Promise<CategoryResponse> {
    return this.prisma.client.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.category.delete({ where: { id } });
  }
}
