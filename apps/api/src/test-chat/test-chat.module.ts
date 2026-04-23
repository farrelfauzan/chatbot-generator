import { Module } from '@nestjs/common';
import { TestChatController } from './test-chat.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [ConversationsModule, MessagesModule, CustomersModule],
  controllers: [TestChatController],
})
export class TestChatModule {}
