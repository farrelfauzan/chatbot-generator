import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { GowaProvider } from '../gowa/gowa.provider';
import { ChatSessionService } from './chat-session.service';
import { SESSION_EXPIRY_QUEUE } from './constants';

@Processor(SESSION_EXPIRY_QUEUE)
export class SessionExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionExpiryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gowa: GowaProvider,
    private readonly chatSession: ChatSessionService,
  ) {
    super();
  }

  async process(
    job: Job<{ phone: string; conversationId: string }>,
  ): Promise<void> {
    const { phone, conversationId } = job.data;

    this.logger.log(
      `Session expired for ${phone}, closing conversation ${conversationId}`,
    );

    try {
      await this.prisma.client.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason: 'session_expired',
        },
      });

      // Silent close — no goodbye message sent to customer.
      // When user chats again, previous context will be restored.
      this.logger.log(`Session silently closed for ${phone}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to close conversation ${conversationId}: ${err.message}`,
      );
    }
  }
}
