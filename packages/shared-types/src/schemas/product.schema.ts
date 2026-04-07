import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive(),
  stockQty: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productResponseSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  price: z.number(),
  stockQty: z.number(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;

export const productQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

// ─── Variant ─────────────────────────────────────────

export const createVariantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().positive(),
  stockQty: z.number().int().min(0).default(0),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;

export const variantResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  stockQty: z.number(),
});

export type VariantResponse = z.infer<typeof variantResponseSchema>;
