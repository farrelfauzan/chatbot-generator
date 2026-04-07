import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  type ICatalogRepository,
} from './catalog.repository.interface';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepo: ICatalogRepository,
  ) {}

  async findAll(query?: ProductQuery) {
    return this.catalogRepo.findAll(query);
  }

  async findById(id: string) {
    const product = await this.catalogRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async listActive(category?: string) {
    return this.catalogRepo.findActive(category);
  }

  async search(term: string) {
    return this.catalogRepo.search(term);
  }

  async create(data: CreateProductInput) {
    return this.catalogRepo.create(data);
  }

  async update(id: string, data: UpdateProductInput) {
    return this.catalogRepo.update(id, data);
  }
}
