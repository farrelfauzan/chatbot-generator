import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrayerService } from '../prayer.service';

@Injectable()
export class PrayerReminderJob {
  private readonly logger = new Logger(PrayerReminderJob.name);

  constructor(private readonly prayer: PrayerService) {}

  @Cron('* * * * *') // Every minute
  async handle(): Promise<void> {
    try {
      await this.prayer.checkAndSendReminders();
    } catch (err) {
      this.logger.error(
        `Prayer reminder job failed: ${(err as Error).message}`,
      );
    }
  }
}
