import { z } from "zod";
import { chatIntentSchema } from "../enums";

export const chatCompletionSchema = z.object({
  message: z.string().min(1),
});

export type ChatCompletionInput = z.infer<typeof chatCompletionSchema>;

export const chatCompletionResponseSchema = z.object({
  provider: z.string(),
  model: z.string(),
  content: z.string(),
});

export type ChatCompletionResponse = z.infer<
  typeof chatCompletionResponseSchema
>;

export const intentClassificationSchema = z.object({
  intent: chatIntentSchema,
  entities: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1),
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;

export const groundedContextSchema = z.object({
  conversationStage: z.string(),
  customerName: z.string().nullable(),
  products: z.array(z.record(z.string(), z.unknown())).optional(),
  faq: z.array(z.record(z.string(), z.unknown())).optional(),
  orderContext: z.record(z.string(), z.unknown()).optional(),
});

export type GroundedContext = z.infer<typeof groundedContextSchema>;
