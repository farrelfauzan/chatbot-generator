import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LlmModule } from './llm/llm.module';
import { GowaModule } from './gowa/gowa.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CustomersModule } from './customers/customers.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { IntentModule } from './intent/intent.module';
import { CatalogModule } from './catalog/catalog.module';
import { CategoriesModule } from './categories/categories.module';
import { FaqModule } from './faq/faq.module';
import { PricingModule } from './pricing/pricing.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { PromptTemplateModule } from './prompt-templates/prompt-template.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { RedisModule } from './redis/redis.module';
import { ChatSessionModule } from './chat-session/chat-session.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    PromptTemplateModule,
    LlmModule,
    GowaModule,
    AuthModule,
    SettingsModule,
    ChatSessionModule,
    CustomersModule,
    MessagesModule,
    IntentModule,
    CatalogModule,
    CategoriesModule,
    FaqModule,
    PricingModule,
    RecommendationModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,
    ConversationsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
