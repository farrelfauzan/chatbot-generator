import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from './conversations.repository.interface';
import type {
  UpdateConversationInput,
  ConversationQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: IConversationRepository,
  ) {}

  async findAll(query?: ConversationQuery) {
    return this.conversationRepo.findAll(query);
  }

  async findById(id: string) {
    const convo = await this.conversationRepo.findById(id);
    if (!convo) throw new NotFoundException('Conversation not found');
    return convo;
  }

  async findOrCreateActive(customerId: string) {
    const active =
      await this.conversationRepo.findActiveByCustomerId(customerId);
    if (active) return active;
    return this.conversationRepo.create(customerId);
  }

  async create(customerId: string) {
    return this.conversationRepo.create(customerId);
  }

  async findLatestByCustomerId(customerId: string) {
    return this.conversationRepo.findLatestByCustomerId(customerId);
  }

  async update(id: string, data: UpdateConversationInput) {
    return this.conversationRepo.update(id, data);
  }

  async touchInbound(id: string) {
    return this.conversationRepo.update(id, {
      lastInboundAt: new Date(),
    } as any);
  }

  async touchOutbound(id: string) {
    return this.conversationRepo.update(id, {
      lastOutboundAt: new Date(),
    } as any);
  }
}
