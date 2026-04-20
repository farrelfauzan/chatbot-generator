import {
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { GowaWebhookGuard } from './gowa-webhook.guard';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type {
  GowaWebhookPayload,
  GowaInboundMessage,
} from '@chatbot-generator/shared-types';

@ApiTags('Webhooks')
@Controller('webhooks/gowa')
@UseGuards(GowaWebhookGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly orchestrator: ConversationOrchestratorService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Single unified endpoint that receives ALL GOWA webhook events.
   * GOWA sends: { event, device_id, timestamp, payload: { ... } }
   */
  @Post('messages')
  async handleWebhook(@Body() body: GowaWebhookPayload) {
    const { event, payload } = body;

    this.logger.debug(`Webhook event: ${event}`);

    switch (event) {
      case 'message':
        return this.handleInboundMessage(payload);

      case 'message.ack':
        return this.handleMessageAck(payload);

      case 'message.revoked':
      case 'message.edited':
      case 'message.reaction':
      case 'message.deleted':
        this.logger.debug(`Ignoring event: ${event}`);
        return { status: 'ok', event };

      case 'chat_presence':
        this.logger.debug(`Typing: ${payload.from} → ${payload.state}`);
        return { status: 'ok', event };

      default:
        this.logger.debug(`Unhandled event: ${event}`);
        return { status: 'ok', event };
    }
  }

  private async handleInboundMessage(payload: Record<string, unknown>) {
    // Skip messages sent by ourselves
    if (payload.is_from_me === true) {
      this.logger.debug('Skipping outgoing message');
      return { status: 'ok', skipped: true };
    }

    const message = this.extractMessageText(payload);
    const media = this.extractMedia(payload);

    // Skip if no text AND no media
    if (!message && !media) {
      this.logger.debug('No text or media content in message, skipping');
      return { status: 'ok', skipped: true };
    }

    const phone = this.extractPhone(payload);
    if (!phone) {
      this.logger.warn('Could not extract phone from payload');
      return { status: 'error', reason: 'no_phone' };
    }

    // Skip group messages and newsletter messages
    const chatId = (payload.chat_id ?? payload.from) as string | undefined;
    if (
      chatId &&
      (chatId.includes('@g.us') || chatId.includes('@newsletter'))
    ) {
      this.logger.debug(`Skipping group/newsletter message from ${chatId}`);
      return { status: 'ok', skipped: true };
    }

    const normalized: GowaInboundMessage = {
      phone,
      message: message || '[Media tanpa caption]',
      messageId: (payload.id as string) ?? undefined,
      timestamp: payload.timestamp
        ? Math.floor(new Date(payload.timestamp as string).getTime() / 1000)
        : undefined,
      senderName: (payload.from_name as string) ?? undefined,
      ...(media
        ? {
            mediaUrl: media.url,
            mediaType: media.mimeType,
            mediaFilename: media.filename,
          }
        : {}),
    };

    // Deduplicate: skip if we already processed this messageId
    if (normalized.messageId) {
      const dedupeKey = `dedup:${normalized.messageId}`;
      const alreadySeen = await this.redis.set(
        dedupeKey,
        '1',
        'EX',
        3600,
        'NX',
      );
      if (!alreadySeen) {
        this.logger.debug(
          `Duplicate message ${normalized.messageId}, skipping`,
        );
        return { status: 'ok', skipped: true, reason: 'duplicate' };
      }
    }

    // Per-phone concurrency lock — only one message processed at a time per phone
    const lockKey = `lock:phone:${phone}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 120, 'NX');
    if (!acquired) {
      this.logger.warn(`Phone ${phone} already being processed, skipping`);
      return { status: 'ok', skipped: true, reason: 'concurrent' };
    }

    try {
      this.logger.log(
        `Inbound from ${phone}: ${(message || '[media]').substring(0, 80)}`,
      );
      await this.orchestrator.handleInboundMessage(normalized);
      return { status: 'ok' };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private handleMessageAck(payload: Record<string, unknown>) {
    const ids = payload.ids as string[] | undefined;
    const receiptType = payload.receipt_type as string | undefined;
    this.logger.debug(`ACK: ${ids?.join(', ')} → ${receiptType ?? 'unknown'}`);
    return { status: 'ok' };
  }

  /**
   * Extract plain phone number from GOWA JID format.
   * "628123456789@s.whatsapp.net" → "628123456789"
   */
  private extractPhone(payload: Record<string, unknown>): string | null {
    const from = (payload.chat_id ?? payload.from) as string | undefined;
    if (!from) return null;

    // Strip WhatsApp JID suffixes
    return from
      .replace('@s.whatsapp.net', '')
      .replace('@lid', '')
      .replace('@g.us', '');
  }

  /**
   * Extract text content from different message types.
   */
  private extractMessageText(payload: Record<string, unknown>): string | null {
    // Text message
    if (typeof payload.body === 'string' && payload.body.trim()) {
      return payload.body as string;
    }

    // Image/video/document with caption
    for (const mediaKey of ['image', 'video', 'document', 'video_note']) {
      const media = payload[mediaKey];
      if (media && typeof media === 'object' && (media as any).caption) {
        return (media as any).caption as string;
      }
    }

    return null;
  }

  /**
   * Extract media info (URL, mimeType, filename) from the payload.
   */
  private extractMedia(
    payload: Record<string, unknown>,
  ): { url: string; mimeType: string; filename: string } | null {
    for (const mediaKey of ['image', 'video', 'document', 'audio', 'sticker']) {
      const media = payload[mediaKey] as Record<string, unknown> | undefined;
      if (media && typeof media === 'object') {
        const url =
          (media.url as string) ||
          (media.link as string) ||
          (media.file_url as string);
        if (!url) continue;

        const mimeType =
          (media.mimetype as string) ||
          (media.mime_type as string) ||
          'application/octet-stream';
        const filename =
          (media.filename as string) ||
          (media.file_name as string) ||
          `${mediaKey}.${mimeType.split('/')[1] || 'bin'}`;

        return { url, mimeType, filename };
      }
    }

    return null;
  }
}
