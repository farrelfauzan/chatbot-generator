import { z } from "zod";

export const createCustomerSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerResponseSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomerResponse = z.infer<typeof customerResponseSchema>;
