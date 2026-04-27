import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

export const MESSAGE_DEBOUNCE_QUEUE = 'message-debounce';

/** How long to wait for more bubbles before processing (ms). */
const DEBOUNCE_DELAY_MS = 3_000;

/** Max time a message can sit in the buffer (ms). Safety cap. */
const MAX_BUFFER_AGE_MS = 15_000;

/** Redis key prefix for the message buffer list. */
const BUFFER_PREFIX = 'msgbuf:';

/** Redis key for the timestamp of the first buffered message. */
const BUFFER_START_PREFIX = 'msgbuf-start:';

@Injectable()
export class MessageBufferService {
  private readonly logger = new Logger(MessageBufferService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(MESSAGE_DEBOUNCE_QUEUE)
    private readonly debounceQueue: Queue,
  ) {}

  /**
   * Buffer an inbound message and schedule (or reschedule) processing.
   * Returns immediately — actual processing happens in the BullMQ worker.
   */
  async bufferMessage(message: GowaInboundMessage): Promise<void> {
    const phone = message.phone;
    const bufferKey = `${BUFFER_PREFIX}${phone}`;
    const startKey = `${BUFFER_START_PREFIX}${phone}`;

    // Append message to the per-phone Redis list
    await this.redis.rpush(bufferKey, JSON.stringify(message));
    // Expire after 60s as a safety net
    await this.redis.expire(bufferKey, 60);

    // Track when the first message arrived (only set if not exists)
    await this.redis.set(startKey, Date.now().toString(), 'EX', 60, 'NX');

    // Check if we've been buffering too long (safety cap)
    const startStr = await this.redis.get(startKey);
    const elapsed = startStr ? Date.now() - Number(startStr) : 0;
    const delay = elapsed >= MAX_BUFFER_AGE_MS ? 0 : DEBOUNCE_DELAY_MS;

    // Remove existing delayed job and schedule a new one (debounce reset)
    const jobId = `debounce-${phone}`;
    const existing = await this.debounceQueue.getJob(jobId);
    if (existing) {
      try {
        await existing.remove();
      } catch {
        // Job may have already started processing — that's fine
      }
    }

    await this.debounceQueue.add(
      'process-buffered',
      { phone },
      {
        jobId,
        delay,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.logger.debug(
      `Buffered message for ${phone} (delay=${delay}ms, buffer elapsed=${elapsed}ms)`,
    );
  }

  /**
   * Drain all buffered messages for a phone and return them.
   * Called by the debounce processor.
   */
  async drainBuffer(phone: string): Promise<GowaInboundMessage[]> {
    const bufferKey = `${BUFFER_PREFIX}${phone}`;
    const startKey = `${BUFFER_START_PREFIX}${phone}`;

    // Atomically get all and delete
    const items = await this.redis.lrange(bufferKey, 0, -1);
    await this.redis.del(bufferKey, startKey);

    return items.map((raw) => JSON.parse(raw) as GowaInboundMessage);
  }
}
