import { z } from "zod";
import { invoiceStatusSchema } from "../enums";

export const invoiceResponseSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  status: invoiceStatusSchema,
  issuedAt: z.coerce.date(),
  dueAt: z.coerce.date().nullable(),
  subtotal: z.number(),
  totalAmount: z.number(),
  fileUrl: z.string().nullable(),
});

export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;

export const invoiceQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
});

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
