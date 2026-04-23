import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { GowaProvider } from '../../gowa/gowa.provider';
import { QuotesService } from '../quotes.service';

@Injectable()
export class DailyQuoteJob {
  private readonly logger = new Logger(DailyQuoteJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gowa: GowaProvider,
    private readonly quotes: QuotesService,
  ) {}

  @Cron('0 6 * * *', { timeZone: 'Asia/Jakarta' }) // 06:00 WIB daily
  async handle(): Promise<void> {
    this.logger.log('Sending daily quotes...');

    try {
      const customers = await this.prisma.client.customer.findMany({
        where: { onboardingDone: true },
        select: { id: true, phoneNumber: true, nickname: true, name: true },
      });

      const quote = await this.quotes.getDailyQuote();
      let sent = 0;

      for (const customer of customers) {
        try {
          const name = customer.nickname || customer.name || 'Kak';
          await this.gowa.sendText(
            customer.phoneNumber,
            `Selamat pagi, ${name} ☀️\n\n${quote}\n\nSemoga harimu penuh berkah 🤲`,
          );
          sent++;
        } catch (err) {
          this.logger.warn(
            `Failed to send quote to ${customer.phoneNumber}: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Daily quotes sent to ${sent}/${customers.length} customers`,
      );
    } catch (err) {
      this.logger.error(`Daily quote cron failed: ${(err as Error).message}`);
    }
  }
}
