import { Inject, Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { GowaProvider } from '../gowa/gowa.provider';
import { AladhanProvider, PrayerTimesData } from './aladhan.provider';
import { PRAYER_REPOSITORY } from './prayer.repository.interface';
import type { IPrayerRepository } from './prayer.repository.interface';

dayjs.extend(utc);
dayjs.extend(timezone);

export const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

export const ALL_PRAYERS = Object.keys(PRAYER_NAMES);

const DISPLAY_NAMES: Record<string, string> = {
  ...PRAYER_NAMES,
  Sunrise: 'Syuruq',
};

@Injectable()
export class PrayerService {
  private readonly logger = new Logger(PrayerService.name);

  constructor(
    @Inject(PRAYER_REPOSITORY)
    private readonly repo: IPrayerRepository,
    private readonly aladhan: AladhanProvider,
    private readonly gowa: GowaProvider,
  ) {}

  async getPrayerTimes(city: string): Promise<string> {
    const data = await this.aladhan.fetchPrayerTimes(city);
    if (!data) {
      return `Maaf, tidak bisa mendapatkan jadwal shalat untuk "${city}". Pastikan nama kota benar.`;
    }
    return this.formatPrayerTimes(data, city);
  }

  /**
   * Set prayer reminder for specific prayers or all.
   * prayers: array of prayer keys like ["Fajr","Maghrib"] or ["all"]
   */
  async setPrayerReminder(
    customerId: string,
    city: string,
    prayers: string[],
    timezone?: string,
  ): Promise<string> {
    const data = await this.aladhan.fetchPrayerTimes(city);
    if (!data) {
      return `Kota "${city}" tidak ditemukan. Coba nama kota lain (contoh: Jakarta, Bandung, Surabaya).`;
    }

    // Normalize: "all" → all 5 prayers
    const selected =
      prayers.includes('all') || prayers.length === 0
        ? ALL_PRAYERS
        : prayers.filter((p) => ALL_PRAYERS.includes(p));

    if (selected.length === 0) {
      return `Nama shalat tidak dikenali. Pilih dari: ${ALL_PRAYERS.map((p) => PRAYER_NAMES[p]).join(', ')}, atau "semua".`;
    }

    await this.repo.upsertReminder(customerId, city, selected, true, timezone);

    const prayerLabels = selected.map((p) => PRAYER_NAMES[p]).join(', ');
    return [
      'Pengingat shalat aktif ✅',
      `📍 Lokasi: ${city}`,
      `🕌 Shalat: ${selected.length === 5 ? 'Semua waktu' : prayerLabels}`,
      '',
      'Kamu akan diingatkan saat waktu shalat tiba!',
    ].join('\n');
  }

  async disablePrayerReminder(customerId: string): Promise<string> {
    await this.repo.disableReminder(customerId);
    return 'Pengingat shalat dinonaktifkan ❌';
  }

  async getReminderStatus(customerId: string): Promise<string> {
    const reminder = await this.repo.findByCustomerId(customerId);
    if (!reminder || !reminder.isActive) {
      return 'Kamu belum mengaktifkan pengingat shalat. Mau diaktifkan?';
    }
    const labels = reminder.prayers.map((p) => PRAYER_NAMES[p] || p).join(', ');
    return `Pengingat shalat aktif ✅\n📍 ${reminder.location}\n🕌 ${labels}`;
  }

  /**
   * Called by cron every minute. Checks all active reminders and sends
   * notifications when a prayer time matches the current minute.
   */
  async checkAndSendReminders(): Promise<void> {
    const reminders = await this.repo.findActiveReminders();
    if (reminders.length === 0) return;

    for (const reminder of reminders) {
      try {
        const tz = reminder.timezone || 'Asia/Jakarta';
        const localTime = dayjs().tz(tz).format('HH:mm');

        const data = await this.aladhan.fetchPrayerTimes(reminder.location);
        if (!data) continue;

        for (const prayer of reminder.prayers) {
          const prayerTime = data.timings[prayer]?.split(' ')[0];
          if (prayerTime !== localTime) continue;

          // Dedup via DB: skip if already sent for this prayer:time combo
          const sentKey = `${prayer}:${prayerTime}`;
          if (reminder.lastSentKey === sentKey) continue;

          const name =
            reminder.customer.nickname || reminder.customer.name || 'Kak';
          const msg = `🕌 *Waktu ${PRAYER_NAMES[prayer]} telah tiba*\n\nHai ${name}, yuk shalat ${PRAYER_NAMES[prayer]} 🤲\nSemoga ibadahmu diterima Allah SWT.`;

          try {
            await this.gowa.sendText(reminder.customer.phoneNumber, msg);
            await this.repo.updateLastSentKey(reminder.id, sentKey);
          } catch (sendErr) {
            this.logger.warn(
              `Failed to send reminder to ${reminder.customer.phoneNumber}: ${(sendErr as Error).message}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Reminder check failed for ${reminder.customerId}: ${(err as Error).message}`,
        );
      }
    }
  }

  private formatPrayerTimes(data: PrayerTimesData, city: string): string {
    const lines = [
      `🕌 *Jadwal Shalat — ${city}*`,
      `📅 ${data.date.readable}`,
      '',
    ];
    for (const [key, label] of Object.entries(DISPLAY_NAMES)) {
      const time = data.timings[key]?.split(' ')[0] || '-';
      lines.push(`${label}: ${time}`);
    }
    return lines.join('\n');
  }
}
