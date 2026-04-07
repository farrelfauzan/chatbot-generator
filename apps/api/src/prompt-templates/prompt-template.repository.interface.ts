import type {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplateResponse,
  PromptTemplateQuery,
} from '@chatbot-generator/shared-types';

export const PROMPT_TEMPLATE_REPOSITORY = 'IPromptTemplateRepository';

export interface IPromptTemplateRepository {
  findById(id: string): Promise<PromptTemplateResponse | null>;
  findBySlug(slug: string): Promise<PromptTemplateResponse | null>;
  findAll(query?: PromptTemplateQuery): Promise<PromptTemplateResponse[]>;
  findActiveByCategory(category: string): Promise<PromptTemplateResponse[]>;
  create(data: CreatePromptTemplateInput): Promise<PromptTemplateResponse>;
  update(
    id: string,
    data: UpdatePromptTemplateInput,
  ): Promise<PromptTemplateResponse>;
  delete(id: string): Promise<void>;
}
