import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import {
  MessageBufferService,
  MESSAGE_DEBOUNCE_QUEUE,
} from './message-buffer.service';
import { MessageDebounceProcessor } from './message-debounce.processor';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    ConversationsModule,
    BullModule.registerQueue({
      name: MESSAGE_DEBOUNCE_QUEUE,
    }),
  ],
  controllers: [WebhooksController],
  providers: [MessageBufferService, MessageDebounceProcessor],
})
export class WebhooksModule {}
