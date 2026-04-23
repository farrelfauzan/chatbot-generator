import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmbeddingProvider } from '../embedding/embedding.provider';
import { SOUL_REPOSITORY } from './soul.repository.interface';
import type { ISoulRepository } from './soul.repository.interface';

export interface UserContext {
  nickname: string;
  location: string | null;
  timezone: string;
  onboardingDone: boolean;
  prayerReminder: {
    location: string;
    prayers: string[];
    isActive: boolean;
  } | null;
  memoCount: number;
  recentMemos: {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
  }[];
  relevantMemos: {
    id: string;
    title: string | null;
    content: string;
    similarity: number;
  }[];
  pendingSchedules: {
    id: string;
    content: string;
    scheduledAt: Date;
    targetName: string | null;
  }[];
}

@Injectable()
export class SoulService implements OnModuleInit {
  private readonly logger = new Logger(SoulService.name);
  private soulContent = '';
  private abilitiesContent = '';

  constructor(
    @Inject(SOUL_REPOSITORY) private readonly repo: ISoulRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  onModuleInit() {
    try {
      // Assets are copied to dist/soul/ but JS compiles to dist/src/soul/
      const assetsDir = join(__dirname, '..', '..', 'soul');
      this.soulContent = readFileSync(
        join(assetsDir, 'wulan-soul.md'),
        'utf-8',
      );
      this.abilitiesContent = readFileSync(
        join(assetsDir, 'wulan-abilities.md'),
        'utf-8',
      );
      this.logger.log('Soul files loaded successfully');
    } catch (err) {
      this.logger.error(`Failed to load soul files: ${(err as Error).message}`);
      this.soulContent =
        'Kamu adalah Wulan, asisten pribadi Muslim di WhatsApp. Ramah, singkat, sopan.';
      this.abilitiesContent = '';
    }
  }

  getSoul(): string {
    return this.soulContent;
  }

  getAbilities(): string {
    return this.abilitiesContent;
  }

  async buildUserContext(
    customerId: string,
    userMessage?: string,
  ): Promise<UserContext> {
    const [customer, prayerReminder, memoCount, recentMemos, pendingSchedules] =
      await Promise.all([
        this.repo.getCustomerProfile(customerId),
        this.repo.getPrayerReminder(customerId),
        this.repo.getMemoCount(customerId),
        this.repo.getRecentMemos(customerId),
        this.repo.getPendingSchedules(customerId),
      ]);

    let relevantMemos: UserContext['relevantMemos'] = [];
    if (userMessage && memoCount > 5) {
      try {
        const queryEmbedding = await this.embedding.embedText(userMessage);
        relevantMemos = await this.repo.searchMemosBySimilarity(
          customerId,
          queryEmbedding,
        );
      } catch (err) {
        this.logger.warn(
          `Memo semantic search failed: ${(err as Error).message}`,
        );
      }
    }

    return {
      nickname: customer?.nickname || customer?.name || 'Kak',
      location: customer?.location || null,
      timezone: customer?.timezone || 'Asia/Jakarta',
      onboardingDone: customer?.onboardingDone || false,
      prayerReminder: prayerReminder
        ? {
            location: prayerReminder.location,
            prayers: prayerReminder.prayers,
            isActive: prayerReminder.isActive,
          }
        : null,
      memoCount,
      recentMemos,
      relevantMemos,
      pendingSchedules,
    };
  }

  formatUserContextForPrompt(ctx: UserContext): string {
    const lines: string[] = ['## USER CONTEXT'];
    lines.push(`- Nama panggilan: ${ctx.nickname}`);
    lines.push(`- Lokasi: ${ctx.location || 'Belum diset'}`);
    lines.push(`- Timezone: ${ctx.timezone}`);
    lines.push(
      `- Onboarding: ${ctx.onboardingDone ? 'Selesai' : 'Belum selesai'}`,
    );

    if (ctx.prayerReminder) {
      const pLabels =
        ctx.prayerReminder.prayers.length === 5
          ? 'Semua waktu'
          : ctx.prayerReminder.prayers.join(', ');
      lines.push(
        `- Pengingat shalat: ${ctx.prayerReminder.isActive ? 'Aktif' : 'Nonaktif'} (${ctx.prayerReminder.location}, ${pLabels})`,
      );
    } else {
      lines.push('- Pengingat shalat: Belum diset');
    }

    lines.push(`- Total memo: ${ctx.memoCount}`);

    if (ctx.recentMemos.length > 0) {
      lines.push('\n### Memo Terbaru:');
      for (const memo of ctx.recentMemos) {
        lines.push(`- ${memo.title || memo.content.substring(0, 50)}`);
      }
    }

    if (ctx.relevantMemos.length > 0) {
      lines.push('\n### Memo Relevan (berdasarkan pesan user):');
      for (const memo of ctx.relevantMemos) {
        lines.push(`- [${memo.title || 'Untitled'}] ${memo.content}`);
      }
    }

    if (ctx.pendingSchedules.length > 0) {
      lines.push('\n### Pesan Terjadwal (pending):');
      for (const sched of ctx.pendingSchedules) {
        const target = sched.targetName || 'self';
        lines.push(
          `- "${sched.content}" → ${target} @ ${sched.scheduledAt.toLocaleString('id-ID', { timeZone: ctx.timezone })}`,
        );
      }
    }

    return lines.join('\n');
  }
}
