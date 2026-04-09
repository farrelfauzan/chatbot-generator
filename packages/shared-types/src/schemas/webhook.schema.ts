import { z } from "zod";

// ─── GOWA Raw Webhook (actual format GOWA sends) ────

export const gowaWebhookPayloadSchema = z.object({
  event: z.string(),
  device_id: z.string().optional(),
  timestamp: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export type GowaWebhookPayload = z.infer<typeof gowaWebhookPayloadSchema>;

// ─── Normalized inbound message (used by orchestrator) ─

export const gowaInboundMessageSchema = z.object({
  phone: z.string().min(1),
  message: z.string(),
  messageId: z.string().optional(),
  timestamp: z.number().optional(),
  senderName: z.string().optional(),
});

export type GowaInboundMessage = z.infer<typeof gowaInboundMessageSchema>;

export const gowaStatusUpdateSchema = z.object({
  messageId: z.string(),
  status: z.string(),
  timestamp: z.number().optional(),
});

export type GowaStatusUpdate = z.infer<typeof gowaStatusUpdateSchema>;
