import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGE_REPOSITORY,
  type IMessageRepository,
} from './messages.repository.interface';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepo: IMessageRepository,
  ) {}

  async storeInbound(
    conversationId: string,
    content: string,
    opts?: { gatewayMessageId?: string; rawPayload?: unknown },
  ) {
    return this.messageRepo.create({
      conversationId,
      direction: 'inbound',
      content,
      ...opts,
    });
  }

  async storeOutbound(conversationId: string, content: string) {
    return this.messageRepo.create({
      conversationId,
      direction: 'outbound',
      content,
    });
  }

  async findByConversationId(conversationId: string) {
    return this.messageRepo.findByConversationId(conversationId);
  }
}
