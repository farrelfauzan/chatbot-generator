import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IConversationRepository } from './conversations.repository.interface';
import type {
  ConversationResponse,
  UpdateConversationInput,
  ConversationQuery,
} from '@chatbot-generator/shared-types';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ConversationResponse | null> {
    return this.prisma.client.conversation.findUnique({ where: { id } }) as any;
  }

  async findActiveByCustomerId(
    customerId: string,
  ): Promise<ConversationResponse | null> {
    return this.prisma.client.conversation.findFirst({
      where: { customerId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async create(customerId: string): Promise<ConversationResponse> {
    return this.prisma.client.conversation.create({
      data: { customerId, status: 'active', stage: 'greeting' },
    }) as any;
  }

  async update(
    id: string,
    data: UpdateConversationInput & {
      lastInboundAt?: Date;
      lastOutboundAt?: Date;
    },
  ): Promise<ConversationResponse> {
    return this.prisma.client.conversation.update({
      where: { id },
      data,
    }) as any;
  }

  async findAll(query?: ConversationQuery): Promise<ConversationResponse[]> {
    return this.prisma.client.conversation.findMany({
      where: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.customerId ? { customerId: query.customerId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { customer: true },
    }) as any;
  }
}
