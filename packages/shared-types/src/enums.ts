import { z } from "zod";

// ─── Conversation ────────────────────────────────────

export const CONVERSATION_STAGES = [
  "greeting",
  "onboarding",
  "active",
] as const;

export type ConversationStage = (typeof CONVERSATION_STAGES)[number];

export const conversationStageSchema = z.enum(CONVERSATION_STAGES);

export const CONVERSATION_STATUSES = ["active", "closed", "escalated"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);

// ─── Chat Intents ────────────────────────────────────

export const CHAT_INTENTS = [
  "greeting",
  "set_prayer_reminder",
  "ask_prayer_times",
  "save_memo",
  "list_memos",
  "delete_memo",
  "schedule_message",
  "ask_quran",
  "ask_islamic",
  "ask_quote",
  "calendar_event",
  "request_human_help",
  "general_qa",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];
export const chatIntentSchema = z.enum(CHAT_INTENTS);

// ─── Scheduled Message ───────────────────────────────

export const SCHEDULED_MESSAGE_STATUSES = [
  "pending",
  "sent",
  "failed",
  "cancelled",
] as const;
export type ScheduledMessageStatus =
  (typeof SCHEDULED_MESSAGE_STATUSES)[number];
export const scheduledMessageStatusSchema = z.enum(SCHEDULED_MESSAGE_STATUSES);

// ─── Message ─────────────────────────────────────────

export const MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export const messageDirectionSchema = z.enum(MESSAGE_DIRECTIONS);

export const MESSAGE_TYPES = [
  "text",
  "image",
  "document",
  "interactive",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];
export const messageTypeSchema = z.enum(MESSAGE_TYPES);
