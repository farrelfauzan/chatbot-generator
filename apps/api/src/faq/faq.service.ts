import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FAQ_REPOSITORY,
  type IFaqRepository,
} from './faq.repository.interface';
import { VectorSearchService } from '../vector-search/vector-search.service';
import { IngestionService } from '../ingestion/ingestion.service';
import type {
  CreateFaqInput,
  UpdateFaqInput,
  FaqQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepo: IFaqRepository,
    private readonly vectorSearch: VectorSearchService,
    private readonly ingestion: IngestionService,
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

  /**
   * Semantic search over FAQ entries using vector similarity.
   * Falls back to keyword matching if no embeddings exist.
   */
  async semanticSearch(query: string, topK = 5) {
    try {
      const results = await this.vectorSearch.searchFaq(query, topK);
      if (results.length > 0) return results;
    } catch (err) {
      this.logger.warn(
        'Vector search failed, falling back to keyword search',
        err,
      );
    }

    // Fallback: keyword matching
    const all = await this.faqRepo.findActive();
    const q = query.toLowerCase();
    return all
      .filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          (f.category && f.category.toLowerCase().includes(q)),
      )
      .slice(0, topK);
  }

  async create(data: CreateFaqInput) {
    const entry = await this.faqRepo.create(data);
    // Async embedding — don't block the response
    this.ingestion.ingestFaqEntry(entry.id).catch((err) => {
      this.logger.warn(`Failed to ingest FAQ entry ${entry.id}`, err);
    });
    return entry;
  }

  async update(id: string, data: UpdateFaqInput) {
    const entry = await this.faqRepo.update(id, data);
    // Re-embed on update
    this.ingestion.ingestFaqEntry(id).catch((err) => {
      this.logger.warn(`Failed to re-ingest FAQ entry ${id}`, err);
    });
    return entry;
  }

  async delete(id: string) {
    return this.faqRepo.delete(id);
  }
}
