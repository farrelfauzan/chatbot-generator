import { z } from "zod";

export const gowaInboundMessageSchema = z.object({
  phone: z.string().min(1),
  message: z.string(),
  messageId: z.string().optional(),
  timestamp: z.number().optional(),
});

export type GowaInboundMessage = z.infer<typeof gowaInboundMessageSchema>;

export const gowaStatusUpdateSchema = z.object({
  messageId: z.string(),
  status: z.string(),
  timestamp: z.number().optional(),
});

export type GowaStatusUpdate = z.infer<typeof gowaStatusUpdateSchema>;
