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
    // Try exact dimension match first (e.g. "15x5x6")
    const dimMatch = term.match(
      /([\d]+(?:[.,][\d]+)?)\s*x\s*([\d]+(?:[.,][\d]+)?)\s*x\s*([\d]+(?:[.,][\d]+)?)/i,
    );
    if (dimMatch) {
      const p = parseFloat(dimMatch[1].replace(',', '.'));
      const l = parseFloat(dimMatch[2].replace(',', '.'));
      const t = parseFloat(dimMatch[3].replace(',', '.'));
      const byDim = await this.prisma.client.cardboardProduct.findMany({
        where: { panjang: p, lebar: l, tinggi: t, isActive: true },
        orderBy: { pricePerPcs: 'asc' },
      });
      if (byDim.length > 0) return byDim;
    }

    // Split into keywords and match any word
    const keywords = term
      .split(/[\s,]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);

    const orConditions = keywords.flatMap((kw) => [
      { name: { contains: kw, mode: 'insensitive' as any } },
      { type: { contains: kw, mode: 'insensitive' as any } },
      { material: { contains: kw, mode: 'insensitive' as any } },
      { description: { contains: kw, mode: 'insensitive' as any } },
    ]);

    if (orConditions.length === 0) {
      orConditions.push({
        name: { contains: term, mode: 'insensitive' as any },
      });
    }

    return this.prisma.client.cardboardProduct.findMany({
      where: {
        isActive: true,
        OR: orConditions,
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
