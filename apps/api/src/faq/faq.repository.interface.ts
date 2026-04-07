import type {
  CreateFaqInput,
  UpdateFaqInput,
  FaqResponse,
  FaqQuery,
} from '@chatbot-generator/shared-types';

export const FAQ_REPOSITORY = 'IFaqRepository';

export interface IFaqRepository {
  findById(id: string): Promise<FaqResponse | null>;
  findAll(query?: FaqQuery): Promise<FaqResponse[]>;
  findActive(category?: string): Promise<FaqResponse[]>;
  create(data: CreateFaqInput): Promise<FaqResponse>;
  update(id: string, data: UpdateFaqInput): Promise<FaqResponse>;
  delete(id: string): Promise<void>;
}
