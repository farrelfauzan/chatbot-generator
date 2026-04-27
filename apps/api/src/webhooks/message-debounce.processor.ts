import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  MessageBufferService,
  MESSAGE_DEBOUNCE_QUEUE,
} from './message-buffer.service';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

@Processor(MESSAGE_DEBOUNCE_QUEUE)
export class MessageDebounceProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageDebounceProcessor.name);

  constructor(
    private readonly buffer: MessageBufferService,
    private readonly orchestrator: ConversationOrchestratorService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job<{ phone: string }>): Promise<void> {
    const { phone } = job.data;

    const messages = await this.buffer.drainBuffer(phone);
    if (messages.length === 0) {
      this.logger.debug(`Debounce fired for ${phone} but buffer empty`);
      return;
    }

    this.logger.log(
      `Processing ${messages.length} buffered message(s) for ${phone}`,
    );

    // Merge multiple bubbles into a single payload
    const merged = this.mergeMessages(messages);

    // Acquire per-phone lock so the orchestrator processes one batch at a time
    const lockKey = `lock:phone:${phone}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 120, 'NX');
    if (!acquired) {
      // Another process is handling this phone — re-buffer and retry
      this.logger.warn(
        `Phone ${phone} locked, re-buffering ${messages.length} messages`,
      );
      for (const msg of messages) {
        await this.buffer.bufferMessage(msg);
      }
      return;
    }

    try {
      await this.orchestrator.handleInboundMessage(merged);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Merge multiple rapid-fire bubbles into a single GowaInboundMessage.
   * Text from all bubbles is joined with newlines.
   * Metadata (messageId, senderName, media) comes from the last message.
   */
  private mergeMessages(messages: GowaInboundMessage[]): GowaInboundMessage {
    if (messages.length === 1) return messages[0];

    const last = messages[messages.length - 1];

    const combinedText = messages.map((m) => m.message).join('\n');

    return {
      ...last,
      message: combinedText,
    };
  }
}
