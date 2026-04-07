import { z } from "zod";
import { orderStatusSchema } from "../enums";

export const createOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  conversationId: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  shippingAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  productNameSnapshot: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  conversationId: z.string().nullable(),
  quoteId: z.string().nullable(),
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
