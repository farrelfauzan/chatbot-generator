import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IPromptTemplateRepository } from './prompt-template.repository.interface';
import type {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplateResponse,
  PromptTemplateQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class PromptTemplateRepository implements IPromptTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PromptTemplateResponse | null> {
    const row = await this.prisma.client.promptTemplate.findUnique({
      where: { id },
    });
    return row ? this.toResponse(row) : null;
  }

  async findBySlug(slug: string): Promise<PromptTemplateResponse | null> {
    const row = await this.prisma.client.promptTemplate.findUnique({
      where: { slug },
    });
    return row ? this.toResponse(row) : null;
  }

  async findAll(
    query?: PromptTemplateQuery,
  ): Promise<PromptTemplateResponse[]> {
    const rows = await this.prisma.client.promptTemplate.findMany({
      where: {
        ...(query?.category ? { category: query.category } : {}),
        ...(query?.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async findActiveByCategory(
    category: string,
  ): Promise<PromptTemplateResponse[]> {
    const rows = await this.prisma.client.promptTemplate.findMany({
      where: { category, isActive: true },
      orderBy: { version: 'desc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async create(
    data: CreatePromptTemplateInput,
  ): Promise<PromptTemplateResponse> {
    const row = await this.prisma.client.promptTemplate.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        content: data.content,
        variables: data.variables,
        isActive: data.isActive,
      },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    data: UpdatePromptTemplateInput,
  ): Promise<PromptTemplateResponse> {
    const row = await this.prisma.client.promptTemplate.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
    return this.toResponse(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.promptTemplate.delete({ where: { id } });
  }

  private toResponse(row: any): PromptTemplateResponse {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      content: row.content,
      variables: Array.isArray(row.variables) ? row.variables : [],
      isActive: row.isActive,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
