import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResponse,
} from '@chatbot-generator/shared-types';

export const CATEGORY_REPOSITORY = 'ICategoryRepository';

export interface ICategoryRepository {
  findAll(): Promise<CategoryResponse[]>;
  findById(id: string): Promise<CategoryResponse | null>;
  create(data: CreateCategoryInput): Promise<CategoryResponse>;
  update(id: string, data: UpdateCategoryInput): Promise<CategoryResponse>;
  delete(id: string): Promise<void>;
}
