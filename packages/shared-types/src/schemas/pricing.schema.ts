import { z } from "zod";

export const pricingRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  discountAmount: z.number().min(0).default(0),
  shippingAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(1).default(0),
});

export type PricingRequest = z.infer<typeof pricingRequestSchema>;

export const pricingLineItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export type PricingLineItem = z.infer<typeof pricingLineItemSchema>;

export const pricingResponseSchema = z.object({
  items: z.array(pricingLineItemSchema),
  subtotal: z.number(),
  discountAmount: z.number(),
  shippingAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
});

export type PricingResponse = z.infer<typeof pricingResponseSchema>;
