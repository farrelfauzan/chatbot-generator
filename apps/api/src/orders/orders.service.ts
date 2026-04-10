import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  type IOrderRepository,
} from './orders.repository.interface';
import { CardboardService } from '../cardboard/cardboard.service';
import type {
  CreateOrderInput,
  OrderQuery,
} from '@chatbot-generator/shared-types';
import { randomBytes } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly cardboard: CardboardService,
  ) {}

  async findAll(query?: OrderQuery) {
    return this.orderRepo.findAll(query);
  }

  async findById(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findLatestByCustomerId(customerId: string) {
    return this.orderRepo.findLatestByCustomerId(customerId);
  }

  async create(input: CreateOrderInput) {
    const items = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = await this.cardboard.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      const price = Number(product.pricePerPcs);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;

      items.push({
        cardboardProductId: product.id,
        productNameSnapshot: product.name,
        quantity: item.quantity,
        unitPrice: price,
        lineTotal,
      });
    }

    const discountAmount = input.discountAmount ?? 0;
    const shippingAmount = input.shippingAmount ?? 0;
    const taxAmount = input.taxAmount ?? 0;
    const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

    const orderNumber = `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    return this.orderRepo.create({
      orderNumber,
      customerId: input.customerId,
      conversationId: input.conversationId,
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
      items,
    });
  }

  async updateStatus(id: string, status: string) {
    return this.orderRepo.updateStatus(id, status);
  }
}
