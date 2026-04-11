import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatSessionService } from './chat-session.service';
import { SessionExpiryProcessor } from './session-expiry.processor';
import { SESSION_EXPIRY_QUEUE } from './constants';
import { GowaModule } from '../gowa/gowa.module';
import { appConfig } from '../app.config';

@Module({
  imports: [
    GowaModule,
    BullModule.forRoot({
      connection: {
        url: appConfig.redis.url,
      },
    }),
    BullModule.registerQueue({
      name: SESSION_EXPIRY_QUEUE,
    }),
  ],
  providers: [ChatSessionService, SessionExpiryProcessor],
  exports: [ChatSessionService],
})
export class ChatSessionModule {}
