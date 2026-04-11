import { Global, Module } from '@nestjs/common';
import { DokuService } from './doku.service';
import { DokuWebhookController } from './doku-webhook.controller';
import { OrdersModule } from '../orders/orders.module';
import { GowaModule } from '../gowa/gowa.module';
import { ChatSessionModule } from '../chat-session/chat-session.module';

@Global()
@Module({
  imports: [OrdersModule, GowaModule, ChatSessionModule],
  controllers: [DokuWebhookController],
  providers: [DokuService],
  exports: [DokuService],
})
export class DokuModule {}
