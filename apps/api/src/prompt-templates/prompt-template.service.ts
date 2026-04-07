import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  PROMPT_TEMPLATE_REPOSITORY,
  type IPromptTemplateRepository,
} from './prompt-template.repository.interface';
import type {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplateQuery,
  PromptTemplateResponse,
} from '@chatbot-generator/shared-types';

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);

  /** In-memory cache keyed by slug → content. Invalidated on writes. */
  private cache = new Map<string, PromptTemplateResponse>();

  constructor(
    @Inject(PROMPT_TEMPLATE_REPOSITORY)
    private readonly repo: IPromptTemplateRepository,
  ) {}

  async findAll(query?: PromptTemplateQuery) {
    return this.repo.findAll(query);
  }

  async findById(id: string) {
    const result = await this.repo.findById(id);
    if (!result) throw new NotFoundException('Prompt template not found');
    return result;
  }

  async findBySlug(slug: string) {
    const result = await this.repo.findBySlug(slug);
    if (!result)
      throw new NotFoundException(`Prompt template "${slug}" not found`);
    return result;
  }

  /**
   * Resolve a prompt template by slug, interpolate variables, and return the
   * final prompt string. Falls back to `fallback` if the slug doesn't exist.
   */
  async resolve(
    slug: string,
    variables: Record<string, string>,
    fallback?: string,
  ): Promise<string> {
    let template = this.cache.get(slug);

    if (!template) {
      template =
        (await this.repo.findBySlug(slug).catch(() => null)) ?? undefined;
      if (template) {
        this.cache.set(slug, template);
      }
    }

    if (!template || !template.isActive) {
      if (fallback) return fallback;
      throw new NotFoundException(`Prompt template "${slug}" not found`);
    }

    return this.interpolate(template.content, variables);
  }

  async create(data: CreatePromptTemplateInput) {
    const result = await this.repo.create(data);
    this.cache.delete(data.slug);
    return result;
  }

  async update(id: string, data: UpdatePromptTemplateInput) {
    const result = await this.repo.update(id, data);
    this.cache.delete(result.slug);
    return result;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (existing) this.cache.delete(existing.slug);
    await this.repo.delete(id);
  }

  /** Clear the in-memory cache (useful after bulk operations) */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Replace `{{variable}}` placeholders in the template content.
   */
  private interpolate(
    content: string,
    variables: Record<string, string>,
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] ?? match;
    });
  }
}
