export const MEMO_REPOSITORY = 'IMemoRepository';

export interface MemoRecord {
  id: string;
  customerId: string;
  content: string;
  title: string | null;
  tags: string[];
  reminderAt: Date | null;
  createdAt: Date;
}

export interface MemoSearchResult {
  id: string;
  title: string | null;
  content: string;
  similarity: number;
}

export interface IMemoRepository {
  create(
    customerId: string,
    content: string,
    options?: { title?: string; tags?: string[]; reminderAt?: Date },
  ): Promise<MemoRecord>;

  findByCustomer(customerId: string, take?: number): Promise<MemoRecord[]>;

  countByCustomer(customerId: string): Promise<number>;

  deleteById(id: string): Promise<void>;

  searchSemantic(
    customerId: string,
    embedding: number[],
    limit?: number,
    threshold?: number,
  ): Promise<MemoSearchResult[]>;

  searchText(
    customerId: string,
    query: string,
    take?: number,
  ): Promise<MemoRecord[]>;

  updateEmbedding(memoId: string, embedding: number[]): Promise<void>;
}
