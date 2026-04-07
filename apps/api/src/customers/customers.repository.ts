import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ICustomerRepository } from './customers.repository.interface';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerResponse,
} from '@chatbot-generator/shared-types';

@Injectable()
export class CustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerResponse | null> {
    return this.prisma.client.customer.findUnique({ where: { id } });
  }

  async findByPhone(phoneNumber: string): Promise<CustomerResponse | null> {
    return this.prisma.client.customer.findUnique({ where: { phoneNumber } });
  }

  async upsertByPhone(
    phoneNumber: string,
    data?: Partial<CreateCustomerInput>,
  ): Promise<CustomerResponse> {
    return this.prisma.client.customer.upsert({
      where: { phoneNumber },
      create: { phoneNumber, ...data },
      update: data ?? {},
    });
  }

  async create(data: CreateCustomerInput): Promise<CustomerResponse> {
    return this.prisma.client.customer.create({ data });
  }

  async update(
    id: string,
    data: UpdateCustomerInput,
  ): Promise<CustomerResponse> {
    return this.prisma.client.customer.update({ where: { id }, data });
  }

  async findAll(): Promise<CustomerResponse[]> {
    return this.prisma.client.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
