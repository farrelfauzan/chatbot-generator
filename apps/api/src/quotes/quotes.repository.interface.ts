export const QUOTES_REPOSITORY = 'IQuotesRepository';

export interface QuoteRecord {
  id: string;
  content: string;
  source: string | null;
  category: string | null;
}

export interface IQuotesRepository {
  count(category?: string): Promise<number>;
  findOneByOffset(
    offset: number,
    category?: string,
  ): Promise<QuoteRecord | null>;
}
