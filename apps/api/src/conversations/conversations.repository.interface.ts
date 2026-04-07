import type {
  ConversationResponse,
  UpdateConversationInput,
  ConversationQuery,
} from '@chatbot-generator/shared-types';

export const CONVERSATION_REPOSITORY = 'IConversationRepository';

export interface IConversationRepository {
  findById(id: string): Promise<ConversationResponse | null>;
  findActiveByCustomerId(
    customerId: string,
  ): Promise<ConversationResponse | null>;
  create(customerId: string): Promise<ConversationResponse>;
  update(
    id: string,
    data: UpdateConversationInput & {
      lastInboundAt?: Date;
      lastOutboundAt?: Date;
    },
  ): Promise<ConversationResponse>;
  findAll(query?: ConversationQuery): Promise<ConversationResponse[]>;
}
