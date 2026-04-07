import type {
  CreateProductInput,
  UpdateProductInput,
  ProductResponse,
  ProductQuery,
} from '@chatbot-generator/shared-types';

export const CATALOG_REPOSITORY = 'ICatalogRepository';

export interface ICatalogRepository {
  findById(id: string): Promise<ProductResponse | null>;
  findBySku(sku: string): Promise<ProductResponse | null>;
  findAll(query?: ProductQuery): Promise<ProductResponse[]>;
  findActive(category?: string): Promise<ProductResponse[]>;
  search(term: string): Promise<ProductResponse[]>;
  create(data: CreateProductInput): Promise<ProductResponse>;
  update(id: string, data: UpdateProductInput): Promise<ProductResponse>;
}
