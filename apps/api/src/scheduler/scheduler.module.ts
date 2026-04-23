import { Module } from '@nestjs/common';
import { GowaModule } from '../gowa/gowa.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerRepository } from './scheduler.repository';
import { ProcessScheduledMessagesJob } from './jobs/process-scheduled-messages.job';
import { SCHEDULER_REPOSITORY } from './scheduler.repository.interface';

@Module({
  imports: [GowaModule],
  providers: [
    { provide: SCHEDULER_REPOSITORY, useClass: SchedulerRepository },
    SchedulerService,
    ProcessScheduledMessagesJob,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
