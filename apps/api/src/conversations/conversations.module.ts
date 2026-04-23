import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRepository } from './conversations.repository';
import { CONVERSATION_REPOSITORY } from './conversations.repository.interface';
import { ConversationOrchestratorUseCase } from './conversation-orchestrator.use-case';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { GowaModule } from '../gowa/gowa.module';
import { ChatSessionModule } from '../chat-session/chat-session.module';
import { SettingsModule } from '../settings/settings.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { SoulModule } from '../soul/soul.module';
import { PrayerModule } from '../prayer/prayer.module';
import { MemoModule } from '../memo/memo.module';
import { QuranModule } from '../quran/quran.module';
import { QuotesModule } from '../quotes/quotes.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [
    CustomersModule,
    MessagesModule,
    GowaModule,
    ChatSessionModule,
    SettingsModule,
    VectorSearchModule,
    SoulModule,
    PrayerModule,
    MemoModule,
    QuranModule,
    QuotesModule,
    SchedulerModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationOrchestratorUseCase,
    { provide: CONVERSATION_REPOSITORY, useClass: ConversationRepository },
  ],
  exports: [ConversationsService, ConversationOrchestratorUseCase],
})
export class ConversationsModule {}
