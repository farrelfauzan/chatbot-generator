import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
} from './payments.repository.interface';
import { OrdersService } from '../orders/orders.service';
import type {
  CreatePaymentInput,
  VerifyPaymentInput,
  PaymentQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
    private readonly orders: OrdersService,
  ) {}

  async findAll(query?: PaymentQuery) {
    return this.paymentRepo.findAll(query);
  }

  async findById(id: string) {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(data: CreatePaymentInput) {
    return this.paymentRepo.create(data);
  }

  async verify(id: string, data: VerifyPaymentInput) {
    const payment = await this.paymentRepo.verify(id, data);

    // Update order status to 'paid' when payment is verified
    if (data.status === 'verified') {
      await this.orders.updateStatus(payment.orderId, 'paid');
    }

    return payment;
  }
}
