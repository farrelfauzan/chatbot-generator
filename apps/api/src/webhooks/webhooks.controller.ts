import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GowaWebhookGuard } from './gowa-webhook.guard';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import type {
  GowaWebhookPayload,
  GowaInboundMessage,
} from '@chatbot-generator/shared-types';

@ApiTags('Webhooks')
@Controller('webhooks/gowa')
@UseGuards(GowaWebhookGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly orchestrator: ConversationOrchestratorService) {}

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
    if (!message) {
      this.logger.debug('No text content in message, skipping');
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
      message,
      messageId: (payload.id as string) ?? undefined,
      timestamp: payload.timestamp
        ? Math.floor(new Date(payload.timestamp as string).getTime() / 1000)
        : undefined,
      senderName: (payload.from_name as string) ?? undefined,
    };

    this.logger.log(`Inbound from ${phone}: ${message.substring(0, 80)}`);

    await this.orchestrator.handleInboundMessage(normalized);
    return { status: 'ok' };
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
}
