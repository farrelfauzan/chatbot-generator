import { z } from "zod";
import { conversationStageSchema, conversationStatusSchema } from "../enums";

export const conversationResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  status: conversationStatusSchema,
  stage: conversationStageSchema,
  lastInboundAt: z.coerce.date().nullable(),
  lastOutboundAt: z.coerce.date().nullable(),
  assignedAdminId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ConversationResponse = z.infer<typeof conversationResponseSchema>;

export const conversationQuerySchema = z.object({
  status: conversationStatusSchema.optional(),
  customerId: z.string().optional(),
});

export type ConversationQuery = z.infer<typeof conversationQuerySchema>;

export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  stage: conversationStageSchema.optional(),
  assignedAdminId: z.string().nullable().optional(),
});

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
