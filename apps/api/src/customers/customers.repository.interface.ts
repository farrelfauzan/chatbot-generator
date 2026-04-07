import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerResponse,
} from '@chatbot-generator/shared-types';

export const CUSTOMER_REPOSITORY = 'ICustomerRepository';

export interface ICustomerRepository {
  findById(id: string): Promise<CustomerResponse | null>;
  findByPhone(phoneNumber: string): Promise<CustomerResponse | null>;
  upsertByPhone(
    phoneNumber: string,
    data?: Partial<CreateCustomerInput>,
  ): Promise<CustomerResponse>;
  create(data: CreateCustomerInput): Promise<CustomerResponse>;
  update(id: string, data: UpdateCustomerInput): Promise<CustomerResponse>;
  findAll(): Promise<CustomerResponse[]>;
}
