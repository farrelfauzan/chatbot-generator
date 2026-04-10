import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CardboardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    type?: string;
    material?: string;
    isReadyStock?: boolean;
    isActive?: boolean;
  }) {
    return this.prisma.client.cardboardProduct.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.material ? { material: filters.material } : {}),
        ...(filters?.isReadyStock !== undefined
          ? { isReadyStock: filters.isReadyStock }
          : {}),
        isActive: filters?.isActive ?? true,
      },
      orderBy: [{ type: 'asc' }, { panjang: 'asc' }, { lebar: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.client.cardboardProduct.findUnique({ where: { id } });
  }

  async findBySku(sku: string) {
    return this.prisma.client.cardboardProduct.findUnique({ where: { sku } });
  }

  async search(term: string) {
    return this.prisma.client.cardboardProduct.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' as any } },
          { type: { contains: term, mode: 'insensitive' as any } },
          { material: { contains: term, mode: 'insensitive' as any } },
          { description: { contains: term, mode: 'insensitive' as any } },
        ],
      },
      orderBy: { pricePerPcs: 'asc' },
    });
  }

  async findByDimensions(panjang: number, lebar: number, tinggi: number) {
    return this.prisma.client.cardboardProduct.findMany({
      where: { panjang, lebar, tinggi, isActive: true },
      orderBy: { pricePerPcs: 'asc' },
    });
  }

  async findClosestMatch(
    panjang: number,
    lebar: number,
    tinggi: number,
    material?: string,
  ) {
    // Find all active products, then sort by dimensional distance
    const all = await this.prisma.client.cardboardProduct.findMany({
      where: {
        isActive: true,
        ...(material ? { material } : {}),
        // Must be >= requested dimensions (box must fit the item)
        panjang: { gte: panjang },
        lebar: { gte: lebar },
        tinggi: { gte: tinggi },
      },
      orderBy: { surfaceArea: 'asc' },
      take: 5,
    });

    if (all.length > 0) return all;

    // Fallback: get closest by surface area even if slightly smaller
    return this.prisma.client.cardboardProduct.findMany({
      where: {
        isActive: true,
        ...(material ? { material } : {}),
      },
      orderBy: { surfaceArea: 'asc' },
      take: 5,
    });
  }

  async findReadyStock() {
    return this.prisma.client.cardboardProduct.findMany({
      where: { isActive: true, isReadyStock: true, stockQty: { gt: 0 } },
      orderBy: { pricePerPcs: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.client.cardboardProduct.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.client.cardboardProduct.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.client.cardboardProduct.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
