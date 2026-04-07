import { z } from "zod";
import { messageDirectionSchema, messageTypeSchema } from "../enums";

export const messageResponseSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: messageDirectionSchema,
  content: z.string(),
  messageType: messageTypeSchema,
  rawPayload: z.any().nullable(),
  gatewayMessageId: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1),
  messageType: messageTypeSchema.default("text"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
