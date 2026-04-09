import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ICatalogRepository } from './catalog.repository.interface';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductResponse,
  ProductQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CatalogRepository implements ICatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductResponse | null> {
    const p = await this.prisma.client.product.findUnique({
      where: { id },
      include: { category: true },
    });
    return p ? this.toResponse(p) : null;
  }

  async findBySku(sku: string): Promise<ProductResponse | null> {
    const p = await this.prisma.client.product.findUnique({ where: { sku } });
    return p ? this.toResponse(p) : null;
  }

  async findAll(query?: ProductQuery): Promise<ProductResponse[]> {
    const rows = await this.prisma.client.product.findMany({
      where: {
        ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query?.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query?.search
          ? { name: { contains: query.search, mode: 'insensitive' as any } }
          : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async findActive(category?: string): Promise<ProductResponse[]> {
    const rows = await this.prisma.client.product.findMany({
      where: {
        isActive: true,
        ...(category
          ? {
              category: {
                name: { equals: category, mode: 'insensitive' as any },
              },
            }
          : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async search(term: string): Promise<ProductResponse[]> {
    const rows = await this.prisma.client.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' as any } },
          { description: { contains: term, mode: 'insensitive' as any } },
          {
            category: { name: { contains: term, mode: 'insensitive' as any } },
          },
        ],
      },
      include: { category: true },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async create(data: CreateProductInput): Promise<ProductResponse> {
    const p = await this.prisma.client.product.create({ data });
    return this.toResponse(p);
  }

  async update(id: string, data: UpdateProductInput): Promise<ProductResponse> {
    const p = await this.prisma.client.product.update({ where: { id }, data });
    return this.toResponse(p);
  }

  private toResponse(p: any): ProductResponse {
    return {
      ...p,
      price: Number(p.price),
      category: p.category ?? null,
    };
  }
}
