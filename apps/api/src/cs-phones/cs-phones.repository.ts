import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ICsPhonesRepository,
  CsPhoneRecord,
} from './cs-phones.repository.interface';

@Injectable()
export class CsPhonesRepository implements ICsPhonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CsPhoneRecord[]> {
    return this.prisma.client.csPhone.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActive(): Promise<CsPhoneRecord[]> {
    return this.prisma.client.csPhone.findMany({
      where: { isActive: true },
      orderBy: { loadCount: 'asc' },
    });
  }

  async findById(id: string): Promise<CsPhoneRecord | null> {
    return this.prisma.client.csPhone.findUnique({ where: { id } });
  }

  async create(data: { phone: string; name: string }): Promise<CsPhoneRecord> {
    console.log('Creating CS phone with data:', data);
    return this.prisma.client.csPhone.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ phone: string; name: string; isActive: boolean }>,
  ): Promise<CsPhoneRecord> {
    return this.prisma.client.csPhone.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.csPhone.delete({ where: { id } });
  }

  async incrementLoad(id: string): Promise<void> {
    await this.prisma.client.csPhone.update({
      where: { id },
      data: {
        loadCount: { increment: 1 },
        lastEscalatedAt: new Date(),
      },
    });
  }

  async resetAllLoads(): Promise<void> {
    await this.prisma.client.csPhone.updateMany({
      data: { loadCount: 0 },
    });
  }
}
