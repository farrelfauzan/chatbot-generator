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
import { FaqModule } from './faq/faq.module';
import { OrdersModule } from './orders/orders.module';
import { PromptTemplateModule } from './prompt-templates/prompt-template.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { RedisModule } from './redis/redis.module';
import { ChatSessionModule } from './chat-session/chat-session.module';
import { S3Module } from './s3/s3.module';
import { DokuModule } from './doku/doku.module';
import { CatalogImagesModule } from './catalog-images/catalog-images.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { VectorSearchModule } from './vector-search/vector-search.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { InvoiceModule } from './invoice/invoice.module';
import { CsPhonesModule } from './cs-phones/cs-phones.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    S3Module,
    DokuModule,
    PromptTemplateModule,
    LlmModule,
    GowaModule,
    AuthModule,
    SettingsModule,
    ChatSessionModule,
    CustomersModule,
    MessagesModule,
    IntentModule,
    FaqModule,
    OrdersModule,
    EmbeddingModule,
    VectorSearchModule,
    IngestionModule,
    InvoiceModule,
    CatalogImagesModule,
    CsPhonesModule,
    ConversationsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
