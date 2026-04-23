import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulerService } from '../scheduler.service';

@Injectable()
export class ProcessScheduledMessagesJob {
  private readonly logger = new Logger(ProcessScheduledMessagesJob.name);

  constructor(private readonly scheduler: SchedulerService) {}

  @Cron('* * * * *') // Every minute
  async handle(): Promise<void> {
    try {
      await this.scheduler.processScheduledMessages();
    } catch (err) {
      this.logger.error(
        `Scheduled messages job failed: ${(err as Error).message}`,
      );
    }
  }
}
