import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SESSION_EXPIRY_QUEUE } from './constants';
import { appConfig } from '../app.config';

export interface SessionData {
  conversationId: string;
  customerId: string;
  phone: string;
  lastActivity: string;
}

const SESSION_PREFIX = 'chat:session:';

@Injectable()
export class ChatSessionService implements OnModuleInit {
  private readonly logger = new Logger(ChatSessionService.name);
  private readonly ttlSeconds = appConfig.session.ttlMinutes * 60;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(SESSION_EXPIRY_QUEUE)
    private readonly expiryQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Clear all chat sessions on startup so every conversation starts fresh
    const keys = await this.redis.keys(`${SESSION_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} stale chat sessions on startup`);
    }

    // Also clear dedup and lock keys
    const dedupKeys = await this.redis.keys('dedup:*');
    const lockKeys = await this.redis.keys('lock:phone:*');
    const allKeys = [...dedupKeys, ...lockKeys];
    if (allKeys.length > 0) {
      await this.redis.del(...allKeys);
      this.logger.log(`Cleared ${allKeys.length} dedup/lock keys on startup`);
    }
  }

  private key(phone: string) {
    return `${SESSION_PREFIX}${phone}`;
  }

  async getSession(phone: string): Promise<SessionData | null> {
    const raw = await this.redis.get(this.key(phone));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async createSession(phone: string, data: SessionData): Promise<void> {
    await this.redis.set(
      this.key(phone),
      JSON.stringify(data),
      'EX',
      this.ttlSeconds,
    );

    // Schedule expiry job (will fire after TTL if not refreshed)
    await this.scheduleExpiry(phone, data.conversationId);

    this.logger.debug(
      `Session created for ${phone} → conv ${data.conversationId} (TTL: ${this.ttlSeconds}s)`,
    );
  }

  async refreshSession(phone: string): Promise<void> {
    const session = await this.getSession(phone);
    if (!session) return;

    // Refresh TTL
    await this.redis.expire(this.key(phone), this.ttlSeconds);
    session.lastActivity = new Date().toISOString();
    await this.redis.set(
      this.key(phone),
      JSON.stringify(session),
      'EX',
      this.ttlSeconds,
    );

    // Reschedule expiry job
    await this.scheduleExpiry(phone, session.conversationId);
  }

  async deleteSession(phone: string): Promise<void> {
    await this.redis.del(this.key(phone));
    // Remove pending expiry job
    const jobId = `expire-${phone}`;
    const job = await this.expiryQueue.getJob(jobId);
    if (job) await job.remove();
  }

  private async scheduleExpiry(
    phone: string,
    conversationId: string,
  ): Promise<void> {
    const jobId = `expire-${phone}`;

    // Remove existing job if any
    const existing = await this.expiryQueue.getJob(jobId);
    if (existing) await existing.remove();

    // Schedule new delayed job
    await this.expiryQueue.add(
      'expire-session',
      { phone, conversationId },
      {
        jobId,
        delay: this.ttlSeconds * 1000,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
