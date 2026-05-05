export const CS_PHONES_REPOSITORY = 'ICsPhonesRepository';

export interface CsPhoneRecord {
  id: string;
  phone: string;
  name: string;
  isActive: boolean;
  loadCount: number;
  lastEscalatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICsPhonesRepository {
  findAll(): Promise<CsPhoneRecord[]>;
  findActive(): Promise<CsPhoneRecord[]>;
  findById(id: string): Promise<CsPhoneRecord | null>;
  create(data: { phone: string; name: string }): Promise<CsPhoneRecord>;
  update(
    id: string,
    data: Partial<{ phone: string; name: string; isActive: boolean }>,
  ): Promise<CsPhoneRecord>;
  delete(id: string): Promise<void>;
  incrementLoad(id: string): Promise<void>;
  resetAllLoads(): Promise<void>;
}
