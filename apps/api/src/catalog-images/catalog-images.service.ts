import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CatalogImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.catalogImage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.client.catalogImage.findUnique({ where: { id } });
  }

  async create(data: {
    title: string;
    description?: string;
    imageUrl: string;
    sortOrder?: number;
  }) {
    return this.prisma.client.catalogImage.create({ data });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.client.catalogImage.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.client.catalogImage.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
