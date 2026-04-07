import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  type ICustomerRepository,
} from './customers.repository.interface';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async findAll() {
    return this.customerRepo.findAll();
  }

  async findById(id: string) {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(phoneNumber: string) {
    return this.customerRepo.findByPhone(phoneNumber);
  }

  async upsertByPhone(
    phoneNumber: string,
    data?: Partial<CreateCustomerInput>,
  ) {
    return this.customerRepo.upsertByPhone(phoneNumber, data);
  }

  async create(data: CreateCustomerInput) {
    return this.customerRepo.create(data);
  }

  async update(id: string, data: UpdateCustomerInput) {
    return this.customerRepo.update(id, data);
  }
}
