import type {
  CreateOrderInput,
  OrderResponse,
  OrderQuery,
} from '@chatbot-generator/shared-types';

export const ORDER_REPOSITORY = 'IOrderRepository';

export interface OrderCreateData {
  orderNumber: string;
  customerId: string;
  conversationId?: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  sablonSides?: number;
  sablonTotal?: number;
  items: Array<{
    productNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    boxType?: string;
    material?: string;
    panjang?: number;
    lebar?: number;
    tinggi?: number;
  }>;
}

export interface IOrderRepository {
  findById(id: string): Promise<OrderResponse | null>;
  findByOrderNumber(orderNumber: string): Promise<OrderResponse | null>;
  findLatestByCustomerId(customerId: string): Promise<OrderResponse | null>;
  findAll(query?: OrderQuery): Promise<OrderResponse[]>;
  create(data: OrderCreateData): Promise<OrderResponse>;
  updateStatus(id: string, status: string): Promise<OrderResponse>;
}
