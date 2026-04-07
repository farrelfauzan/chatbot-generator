import { z } from "zod";

// ─── Create / Update ─────────────────────────────────

export const upsertBotConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export type UpsertBotConfigInput = z.infer<typeof upsertBotConfigSchema>;

// ─── Response ────────────────────────────────────────

export const botConfigResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.unknown(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BotConfigResponse = z.infer<typeof botConfigResponseSchema>;
