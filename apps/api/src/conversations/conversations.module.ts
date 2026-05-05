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
import { GowaModule } from '../gowa/gowa.module';
import { ChatSessionModule } from '../chat-session/chat-session.module';
import { SettingsModule } from '../settings/settings.module';
import { CatalogImagesModule } from '../catalog-images/catalog-images.module';
import { DokuModule } from '../doku/doku.module';
import { PromptTemplateModule } from '../prompt-templates/prompt-template.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { CustomerFilesModule } from '../customer-files/customer-files.module';
import { CsPhonesModule } from '../cs-phones/cs-phones.module';

@Module({
  imports: [
    CustomersModule,
    MessagesModule,
    FaqModule,
    OrdersModule,
    GowaModule,
    ChatSessionModule,
    SettingsModule,
    CatalogImagesModule,
    DokuModule,
    PromptTemplateModule,
    VectorSearchModule,
    CustomerFilesModule,
    CsPhonesModule,
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
