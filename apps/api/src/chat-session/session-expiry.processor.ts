import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { GowaService } from '../gowa/gowa.service';
import { ChatSessionService } from './chat-session.service';
import { SESSION_EXPIRY_QUEUE } from './constants';

@Processor(SESSION_EXPIRY_QUEUE)
export class SessionExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionExpiryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gowa: GowaService,
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
      // Snapshot the cart before it expires with the session
      const cart = await this.chatSession.getCart(phone);
      const cartSnapshot = cart.length > 0 ? cart : undefined;
      if (cartSnapshot) {
        this.logger.log(
          `Saving cart snapshot (${cart.length} items) for conversation ${conversationId}`,
        );
      }

      await this.prisma.client.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closeReason: 'session_expired',
          ...(cartSnapshot
            ? { cartSnapshot: JSON.parse(JSON.stringify(cartSnapshot)) }
            : {}),
        },
      });

      // Send goodbye message to customer
      const message = [
        'Halo kak, sepertinya sudah lama tidak ada balasan nih 😊',
        '',
        'Sesi chat ini sudah kami tutup ya. Kalau nanti butuh bantuan lagi, tinggal kirim pesan aja kapan saja!',
        '',
        'Terima kasih kak! 🙏',
      ].join('\n');

      await this.gowa.sendText(phone, message);
      this.logger.log(`Session expiry message sent to ${phone}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to close conversation ${conversationId}: ${err.message}`,
      );
    }
  }
}
