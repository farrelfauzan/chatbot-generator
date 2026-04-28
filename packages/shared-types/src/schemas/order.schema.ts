import { z } from "zod";
import { orderStatusSchema } from "../enums";

export const createOrderItemSchema = z.object({
  productId: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
  // Custom box specs (for formula-based pricing)
  boxType: z.string().optional(),
  material: z.string().optional(),
  panjang: z.number().optional(),
  lebar: z.number().optional(),
  tinggi: z.number().optional(),
  unitPrice: z.number().optional(),
  productName: z.string().optional(),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  conversationId: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  shippingAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productNameSnapshot: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  boxType: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  panjang: z.number().nullable().optional(),
  lebar: z.number().nullable().optional(),
  tinggi: z.number().nullable().optional(),
});

export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  conversationId: z.string().nullable(),
  status: orderStatusSchema,
  subtotal: z.number(),
  discountAmount: z.number(),
  shippingAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(orderItemResponseSchema).optional(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;

export const orderQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  customerId: z.string().optional(),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;
