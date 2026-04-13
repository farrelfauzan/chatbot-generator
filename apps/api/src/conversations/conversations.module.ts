import { Module, forwardRef } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRepository } from './conversations.repository';
import { CONVERSATION_REPOSITORY } from './conversations.repository.interface';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { FaqModule } from '../faq/faq.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { GowaModule } from '../gowa/gowa.module';
import { ChatSessionModule } from '../chat-session/chat-session.module';
import { SettingsModule } from '../settings/settings.module';
import { CatalogImagesModule } from '../catalog-images/catalog-images.module';
import { DokuModule } from '../doku/doku.module';
import { PromptTemplateModule } from '../prompt-templates/prompt-template.module';

@Module({
  imports: [
    CustomersModule,
    MessagesModule,
    FaqModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,
    GowaModule,
    ChatSessionModule,
    SettingsModule,
    CatalogImagesModule,
    DokuModule,
    PromptTemplateModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationOrchestratorService,
    { provide: CONVERSATION_REPOSITORY, useClass: ConversationRepository },
  ],
  exports: [ConversationsService, ConversationOrchestratorService],
})
export class ConversationsModule {}
