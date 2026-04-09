import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from './category.repository.interface';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: ICategoryRepository,
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: CreateCategoryInput) {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateCategoryInput) {
    await this.findById(id);
    return this.repo.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
