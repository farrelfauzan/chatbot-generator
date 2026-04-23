import { Inject, Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { GowaProvider } from '../gowa/gowa.provider';
import { SCHEDULER_REPOSITORY } from './scheduler.repository.interface';
import type { ISchedulerRepository } from './scheduler.repository.interface';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(SCHEDULER_REPOSITORY) private readonly repo: ISchedulerRepository,
    private readonly gowa: GowaProvider,
  ) {}

  async scheduleMessage(
    customerId: string,
    content: string,
    scheduledAt: Date,
    options?: {
      targetPhone?: string;
      targetName?: string;
      repeatInterval?: string;
      timezone?: string;
    },
  ): Promise<string> {
    if (scheduledAt.getTime() <= Date.now()) {
      return 'Waktu jadwal harus di masa depan. Coba sebutkan waktu yang lebih spesifik.';
    }

    const customerPhone = await this.repo.getCustomerPhone(customerId);
    if (!customerPhone) return 'Customer tidak ditemukan.';

    const targetPhone = options?.targetPhone || customerPhone;

    // Validate repeatInterval
    const validIntervals = ['daily', 'weekly', 'monthly'];
    const repeatInterval =
      options?.repeatInterval && validIntervals.includes(options.repeatInterval)
        ? options.repeatInterval
        : null;

    // Check for duplicate: same content, same target, same time (within 5 min window)
    const existing = await this.repo.findPendingByCustomer(customerId);
    const fiveMin = 5 * 60 * 1000;
    const duplicate = existing.find(
      (msg) =>
        msg.targetPhone === targetPhone &&
        msg.content.toLowerCase() === content.toLowerCase() &&
        Math.abs(msg.scheduledAt.getTime() - scheduledAt.getTime()) < fiveMin,
    );
    if (duplicate) {
      const tz = options?.timezone || 'Asia/Jakarta';
      const timeStr = dayjs(duplicate.scheduledAt)
        .tz(tz)
        .format('DD/MM/YYYY HH:mm');
      return `Pengingat ini sudah ada ✅\n📩 "${duplicate.content}"\n⏰ Waktu: ${timeStr}\n\nTidak perlu dibuat lagi ya!`;
    }

    await this.repo.create({
      customerId,
      targetPhone,
      targetName: options?.targetName || null,
      content,
      scheduledAt,
      repeatInterval,
    });

    const target =
      options?.targetName ||
      (targetPhone === customerPhone ? 'kamu sendiri' : targetPhone);
    const timeStr = dayjs(scheduledAt)
      .tz(options?.timezone || 'Asia/Jakarta')
      .format('DD/MM/YYYY HH:mm');
    const repeatLabel = repeatInterval
      ? `\n🔁 Berulang: ${repeatInterval === 'daily' ? 'Setiap hari' : repeatInterval === 'weekly' ? 'Setiap minggu' : 'Setiap bulan'}`
      : '';

    return `Pesan terjadwal ✅\n📩 "${content}"\n👤 Ke: ${target}\n⏰ Waktu: ${timeStr}${repeatLabel}`;
  }

  async listScheduledMessages(customerId: string): Promise<string> {
    const messages = await this.repo.findPendingByCustomer(customerId);
    if (messages.length === 0) return 'Tidak ada pesan terjadwal 📩';

    const lines = ['📩 *Pesan Terjadwal:*', ''];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isSelf = msg.targetPhone === msg.customer.phoneNumber;
      const target = isSelf
        ? 'Pengingat pribadi'
        : msg.targetName || msg.targetPhone;
      const tz = msg.customer.timezone || 'Asia/Jakarta';
      const time = dayjs(msg.scheduledAt).tz(tz).format('DD/MM/YYYY HH:mm');
      const repeat = msg.repeatInterval
        ? ` 🔁 ${msg.repeatInterval === 'daily' ? 'Harian' : msg.repeatInterval === 'weekly' ? 'Mingguan' : 'Bulanan'}`
        : '';
      lines.push(
        `${i + 1}. "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`,
      );
      lines.push(`   ⏰ ${time}${repeat}${isSelf ? '' : ` → ${target}`}`);
    }
    return lines.join('\n');
  }

  async cancelScheduledMessage(
    customerId: string,
    scheduleNumber: number,
  ): Promise<string> {
    const messages = await this.repo.findPendingByCustomer(customerId);
    const index = scheduleNumber - 1;
    if (index < 0 || index >= messages.length) {
      return `Nomor jadwal tidak valid. Kamu punya ${messages.length} pesan terjadwal (1-${messages.length}).`;
    }

    const msg = messages[index];
    await this.repo.updateStatus(msg.id, 'cancelled');
    return `Pesan terjadwal dibatalkan ✅\n"${msg.content.substring(0, 50)}"`;
  }

  async processScheduledMessages(): Promise<void> {
    const now = new Date();
    const dueMessages = await this.repo.findDueMessages(now);

    for (const msg of dueMessages) {
      try {
        await this.gowa.sendText(msg.targetPhone, msg.content);
        await this.repo.updateStatus(msg.id, 'sent', new Date());
        this.logger.log(
          `Scheduled message sent: ${msg.id} → ${msg.targetPhone}`,
        );

        // Reschedule if repeatable
        if (msg.repeatInterval) {
          const nextDate = this.computeNextOccurrence(
            msg.scheduledAt,
            msg.repeatInterval,
          );
          if (nextDate) {
            await this.repo.create({
              customerId: msg.customerId,
              targetPhone: msg.targetPhone,
              targetName: msg.targetName,
              content: msg.content,
              scheduledAt: nextDate,
              repeatInterval: msg.repeatInterval,
            });
            this.logger.log(
              `Repeatable message rescheduled: ${msg.id} → next at ${nextDate.toISOString()}`,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to send scheduled message ${msg.id}: ${(err as Error).message}`,
        );
        await this.repo.updateStatus(msg.id, 'failed');
      }
    }
  }

  private computeNextOccurrence(current: Date, interval: string): Date | null {
    const d = dayjs(current);
    switch (interval) {
      case 'daily':
        return d.add(1, 'day').toDate();
      case 'weekly':
        return d.add(1, 'week').toDate();
      case 'monthly':
        return d.add(1, 'month').toDate();
      default:
        return null;
    }
  }
}
