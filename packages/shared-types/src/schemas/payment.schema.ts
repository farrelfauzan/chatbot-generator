import { z } from "zod";
import { paymentStatusSchema } from "../enums";

export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  invoiceId: z.string().optional(),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  proofUrl: z.string().url().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const verifyPaymentSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  verifiedBy: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const paymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  invoiceId: z.string().nullable(),
  customerId: z.string(),
  amount: z.number(),
  paymentMethod: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  proofUrl: z.string().nullable(),
  status: paymentStatusSchema,
  paidAt: z.coerce.date().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  verifiedBy: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

export const paymentQuerySchema = z.object({
  status: paymentStatusSchema.optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
});

export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
