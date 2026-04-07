import { Module, forwardRef } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRepository } from './conversations.repository';
import { CONVERSATION_REPOSITORY } from './conversations.repository.interface';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { IntentModule } from '../intent/intent.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FaqModule } from '../faq/faq.module';
import { PricingModule } from '../pricing/pricing.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { LlmModule } from '../llm/llm.module';
import { GowaModule } from '../gowa/gowa.module';

@Module({
  imports: [
    CustomersModule,
    MessagesModule,
    IntentModule,
    CatalogModule,
    FaqModule,
    PricingModule,
    RecommendationModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,
    LlmModule,
    GowaModule,
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
