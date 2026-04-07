import { z } from "zod";

// ─── Prompt Template Categories ──────────────────────

export const PROMPT_CATEGORIES = [
  "intent_classification",
  "grounded_reply",
  "requirement_extraction",
  "recommendation_explanation",
  "general",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

// ─── Create / Update ─────────────────────────────────

export const createPromptTemplateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9_-]+$/,
      "Slug must be lowercase alphanumeric with hyphens/underscores",
    ),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(PROMPT_CATEGORIES),
  content: z.string().min(1),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type CreatePromptTemplateInput = z.infer<
  typeof createPromptTemplateSchema
>;

export const updatePromptTemplateSchema = createPromptTemplateSchema
  .omit({ slug: true })
  .partial();

export type UpdatePromptTemplateInput = z.infer<
  typeof updatePromptTemplateSchema
>;

// ─── Response ────────────────────────────────────────

export const promptTemplateResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  content: z.string(),
  variables: z.array(z.string()),
  isActive: z.boolean(),
  version: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PromptTemplateResponse = z.infer<
  typeof promptTemplateResponseSchema
>;

// ─── Query ───────────────────────────────────────────

export const promptTemplateQuerySchema = z.object({
  category: z.enum(PROMPT_CATEGORIES).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type PromptTemplateQuery = z.infer<typeof promptTemplateQuerySchema>;
