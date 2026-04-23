import { Module } from '@nestjs/common';
import { GowaModule } from '../gowa/gowa.module';
import { PrayerService } from './prayer.service';
import { PrayerRepository } from './prayer.repository';
import { AladhanProvider } from './aladhan.provider';
import { PrayerReminderJob } from './jobs/prayer-reminder.job';
import { PRAYER_REPOSITORY } from './prayer.repository.interface';

@Module({
  imports: [GowaModule],
  providers: [
    { provide: PRAYER_REPOSITORY, useClass: PrayerRepository },
    AladhanProvider,
    PrayerService,
    PrayerReminderJob,
  ],
  exports: [PrayerService],
})
export class PrayerModule {}
