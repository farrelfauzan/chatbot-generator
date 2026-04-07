import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IMessageRepository,
  StoreMessageData,
} from './messages.repository.interface';
import type { MessageResponse } from '@chatbot-generator/shared-types';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: StoreMessageData): Promise<MessageResponse> {
    return this.prisma.client.message.create({
      data: {
        conversationId: data.conversationId,
        direction: data.direction,
        content: data.content,
        messageType: data.messageType ?? 'text',
        rawPayload: data.rawPayload as any,
        gatewayMessageId: data.gatewayMessageId,
      },
    }) as any;
  }

  async findByConversationId(
    conversationId: string,
  ): Promise<MessageResponse[]> {
    return this.prisma.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    }) as any;
  }
}
