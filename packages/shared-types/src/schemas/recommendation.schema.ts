import { z } from "zod";

export const recommendationRequestSchema = z.object({
  category: z.string().optional(),
  budgetMax: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  useCase: z.string().optional(),
  specs: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const recommendationResultSchema = z.object({
  primaryProduct: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    stockQty: z.number(),
    matchReason: z.string(),
  }),
  alternativeProduct: z
    .object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      stockQty: z.number(),
      matchReason: z.string(),
    })
    .nullable(),
  explanation: z.string(),
});

export type RecommendationResult = z.infer<typeof recommendationResultSchema>;
