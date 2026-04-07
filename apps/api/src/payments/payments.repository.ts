import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IPaymentRepository } from './payments.repository.interface';
import type {
  CreatePaymentInput,
  VerifyPaymentInput,
  PaymentResponse,
  PaymentQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentResponse | null> {
    const p = await this.prisma.client.payment.findUnique({ where: { id } });
    return p ? this.toResponse(p) : null;
  }

  async findAll(query?: PaymentQuery): Promise<PaymentResponse[]> {
    const rows = await this.prisma.client.payment.findMany({
      where: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.orderId ? { orderId: query.orderId } : {}),
        ...(query?.customerId ? { customerId: query.customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async create(data: CreatePaymentInput): Promise<PaymentResponse> {
    const p = await this.prisma.client.payment.create({
      data: {
        orderId: data.orderId,
        invoiceId: data.invoiceId,
        customerId: data.customerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        proofUrl: data.proofUrl,
        paidAt: new Date(),
      },
    });
    return this.toResponse(p);
  }

  async verify(id: string, data: VerifyPaymentInput): Promise<PaymentResponse> {
    const p = await this.prisma.client.payment.update({
      where: { id },
      data: {
        status: data.status,
        verifiedBy: data.verifiedBy,
        verifiedAt: new Date(),
      },
    });
    return this.toResponse(p);
  }

  private toResponse(p: any): PaymentResponse {
    return { ...p, amount: Number(p.amount) };
  }
}
