import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { PromptTemplateModule } from './prompt-templates/prompt-template.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { RedisModule } from './redis/redis.module';
import { ChatSessionModule } from './chat-session/chat-session.module';
import { S3Module } from './s3/s3.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { VectorSearchModule } from './vector-search/vector-search.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { SoulModule } from './soul/soul.module';
import { PrayerModule } from './prayer/prayer.module';
import { MemoModule } from './memo/memo.module';
import { QuranModule } from './quran/quran.module';
import { QuotesModule } from './quotes/quotes.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TestChatModule } from './test-chat/test-chat.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    S3Module,
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
    EmbeddingModule,
    VectorSearchModule,
    IngestionModule,
    SoulModule,
    PrayerModule,
    MemoModule,
    QuranModule,
    QuotesModule,
    SchedulerModule,
    ConversationsModule,
    WebhooksModule,
    TestChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
