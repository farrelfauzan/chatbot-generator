import { z } from "zod";

// ─── Conversation ────────────────────────────────────

export const CONVERSATION_STAGES = [
  "greeting",
  "discovery",
  "recommendation",
  "pricing",
  "collecting_items",
  "order_summary",
  "collecting_recipient",
  "order_confirm",
  "bargaining",
  "invoiced",
  "payment_pending",
  "paid",
  "fulfilled",
] as const;

export type ConversationStage = (typeof CONVERSATION_STAGES)[number];

export const conversationStageSchema = z.enum(CONVERSATION_STAGES);

export const CONVERSATION_STATUSES = ["active", "closed", "escalated"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);

// ─── Chat Intents ────────────────────────────────────

export const CHAT_INTENTS = [
  "greeting",
  "browse_catalog",
  "ask_stock",
  "ask_price",
  "ask_product_detail",
  "ask_recommendation",
  "compare_products",
  "calculate_price",
  "objection_or_hesitation",
  "bargain",
  "create_order",
  "request_invoice",
  "confirm_payment",
  "ask_order_status",
  "request_human_help",
  "general_qa",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];
export const chatIntentSchema = z.enum(CHAT_INTENTS);

// ─── Order ───────────────────────────────────────────

export const ORDER_STATUSES = [
  "draft",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "fulfilled",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const orderStatusSchema = z.enum(ORDER_STATUSES);

// ─── Invoice ─────────────────────────────────────────

export const INVOICE_STATUSES = [
  "issued",
  "paid",
  "cancelled",
  "overdue",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

// ─── Payment ─────────────────────────────────────────

export const PAYMENT_STATUSES = ["pending", "verified", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

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
