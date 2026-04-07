import type { MessageResponse } from '@chatbot-generator/shared-types';

export const MESSAGE_REPOSITORY = 'IMessageRepository';

export interface StoreMessageData {
  conversationId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  messageType?: string;
  rawPayload?: unknown;
  gatewayMessageId?: string;
}

export interface IMessageRepository {
  create(data: StoreMessageData): Promise<MessageResponse>;
  findByConversationId(conversationId: string): Promise<MessageResponse[]>;
}
