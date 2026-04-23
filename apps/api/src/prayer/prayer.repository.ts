import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IPrayerRepository,
  PrayerReminderRecord,
} from './prayer.repository.interface';

@Injectable()
export class PrayerRepository implements IPrayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertReminder(
    customerId: string,
    location: string,
    prayers: string[],
    isActive: boolean,
    timezone?: string,
  ): Promise<void> {
    const tz = timezone || 'Asia/Jakarta';
    await this.prisma.client.prayerReminder.upsert({
      where: { customerId },
      create: { customerId, location, prayers, isActive, timezone: tz },
      update: { location, prayers, isActive, timezone: tz, lastSentKey: null },
    });
  }

  async updateLastSentKey(reminderId: string, key: string): Promise<void> {
    await this.prisma.client.prayerReminder.update({
      where: { id: reminderId },
      data: { lastSentKey: key },
    });
  }

  async findActiveReminders(): Promise<PrayerReminderRecord[]> {
    return this.prisma.client.prayerReminder.findMany({
      where: { isActive: true },
      include: {
        customer: {
          select: { phoneNumber: true, nickname: true, name: true },
        },
      },
    });
  }

  async findByCustomerId(customerId: string) {
    return this.prisma.client.prayerReminder.findUnique({
      where: { customerId },
      select: { location: true, prayers: true, isActive: true },
    });
  }

  async disableReminder(customerId: string): Promise<void> {
    await this.prisma.client.prayerReminder.updateMany({
      where: { customerId },
      data: { isActive: false },
    });
  }
}
