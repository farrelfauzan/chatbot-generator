import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
