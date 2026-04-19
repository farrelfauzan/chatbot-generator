import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IOrderRepository,
  OrderCreateData,
} from './orders.repository.interface';
import type {
  OrderResponse,
  OrderQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<OrderResponse | null> {
    const o = await this.prisma.client.order.findUnique({
      where: { id },
      include: { items: true },
    });
    return o ? this.toResponse(o) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderResponse | null> {
    const o = await this.prisma.client.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    return o ? this.toResponse(o) : null;
  }

  async findLatestByCustomerId(
    customerId: string,
  ): Promise<OrderResponse | null> {
    const o = await this.prisma.client.order.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return o ? this.toResponse(o) : null;
  }

  async findAll(query?: OrderQuery): Promise<OrderResponse[]> {
    const rows = await this.prisma.client.order.findMany({
      where: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.customerId ? { customerId: query.customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return rows.map((r: any) => this.toResponse(r));
  }

  async create(data: OrderCreateData): Promise<OrderResponse> {
    const o = await this.prisma.client.order.create({
      data: {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        conversationId: data.conversationId,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount,
        shippingAmount: data.shippingAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        sablonSides: data.sablonSides ?? 0,
        sablonTotal: data.sablonTotal ?? 0,
        items: {
          create: data.items.map((item) => ({
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            boxType: item.boxType,
            material: item.material,
            panjang: item.panjang,
            lebar: item.lebar,
            tinggi: item.tinggi,
          })),
        },
      },
      include: { items: true },
    });
    return this.toResponse(o);
  }

  async updateStatus(id: string, status: string): Promise<OrderResponse> {
    const o = await this.prisma.client.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return this.toResponse(o);
  }

  private toResponse(o: any): OrderResponse {
    return {
      ...o,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      shippingAmount: Number(o.shippingAmount),
      taxAmount: Number(o.taxAmount),
      totalAmount: Number(o.totalAmount),
      items: o.items?.map((i: any) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    };
  }
}
