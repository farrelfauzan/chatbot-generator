import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FAQ_REPOSITORY,
  type IFaqRepository,
} from './faq.repository.interface';
import type {
  CreateFaqInput,
  UpdateFaqInput,
  FaqQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class FaqService {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepo: IFaqRepository,
  ) {}

  async findAll(query?: FaqQuery) {
    return this.faqRepo.findAll(query);
  }

  async findById(id: string) {
    const faq = await this.faqRepo.findById(id);
    if (!faq) throw new NotFoundException('FAQ entry not found');
    return faq;
  }

  async listActive(category?: string) {
    return this.faqRepo.findActive(category);
  }

  async create(data: CreateFaqInput) {
    return this.faqRepo.create(data);
  }

  async update(id: string, data: UpdateFaqInput) {
    return this.faqRepo.update(id, data);
  }

  async delete(id: string) {
    return this.faqRepo.delete(id);
  }
}
