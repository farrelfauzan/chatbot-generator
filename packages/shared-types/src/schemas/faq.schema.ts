import { z } from "zod";

export const createFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateFaqInput = z.infer<typeof createFaqSchema>;

export const updateFaqSchema = createFaqSchema.partial();
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;

export const faqResponseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string().nullable(),
  isActive: z.boolean(),
});

export type FaqResponse = z.infer<typeof faqResponseSchema>;

export const faqQuerySchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type FaqQuery = z.infer<typeof faqQuerySchema>;
