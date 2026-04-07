import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IInvoiceRepository,
  InvoiceCreateData,
} from './invoices.repository.interface';
import type {
  InvoiceResponse,
  InvoiceQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InvoiceResponse | null> {
    const inv = await this.prisma.client.invoice.findUnique({ where: { id } });
    return inv ? this.toResponse(inv) : null;
  }

  async findByOrderId(orderId: string): Promise<InvoiceResponse | null> {
    const inv = await this.prisma.client.invoice.findFirst({
      where: { orderId },
      orderBy: { issuedAt: 'desc' },
    });
    return inv ? this.toResponse(inv) : null;
  }

  async findAll(query?: InvoiceQuery): Promise<InvoiceResponse[]> {
    const rows = await this.prisma.client.invoice.findMany({
      where: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.orderId ? { orderId: query.orderId } : {}),
        ...(query?.customerId ? { customerId: query.customerId } : {}),
      },
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async create(data: InvoiceCreateData): Promise<InvoiceResponse> {
    const inv = await this.prisma.client.invoice.create({ data });
    return this.toResponse(inv);
  }

  async updateStatus(id: string, status: string): Promise<InvoiceResponse> {
    const inv = await this.prisma.client.invoice.update({
      where: { id },
      data: { status },
    });
    return this.toResponse(inv);
  }

  private toResponse(inv: any): InvoiceResponse {
    return {
      ...inv,
      subtotal: Number(inv.subtotal),
      totalAmount: Number(inv.totalAmount),
    };
  }
}
