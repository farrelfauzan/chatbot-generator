import { Body, Controller, Get, Post, Logger, Res } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyReply } from 'fastify';
import { ConversationOrchestratorUseCase } from '../conversations/conversation-orchestrator.use-case';
import { MessagesService } from '../messages/messages.service';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from '../conversations/conversations.service';

@Controller('test-chat')
export class TestChatController {
  private readonly logger = new Logger(TestChatController.name);

  constructor(
    private readonly orchestrator: ConversationOrchestratorUseCase,
    private readonly messages: MessagesService,
    private readonly customers: CustomersService,
    private readonly conversations: ConversationsService,
  ) {}

  @Get()
  servePage(@Res() reply: FastifyReply) {
    const html = readFileSync(
      join(__dirname, '..', '..', 'test-chat', 'chat.html'),
      'utf-8',
    );
    reply.type('text/html').send(html);
  }

  @Post()
  async chat(@Body() body: { phone: string; message: string }) {
    const { phone, message } = body;
    if (!phone || !message) {
      return { error: 'phone and message are required' };
    }

    // Find/create customer + conversation to read reply later
    const customer = await this.customers.upsertByPhone(phone, {});
    const existing = await this.conversations.findLatestByCustomerId(
      customer.id,
    );

    try {
      // The orchestrator stores the reply in DB, then tries gowa.sendText which will fail
      await this.orchestrator.handleInboundMessage({
        phone,
        message,
        senderName: 'Web Tester',
      });
    } catch (err) {
      // GoWA send failure is expected — reply is already stored in DB
      this.logger.debug(
        `GoWA send failed (expected in web mode): ${(err as Error).message}`,
      );
    }

    // Fetch the conversation (may have been created by orchestrator)
    const conv =
      existing ??
      (await this.conversations.findLatestByCustomerId(customer.id));
    if (!conv) {
      return { reply: 'Gagal memproses pesan.' };
    }

    // Get latest outbound message
    const allMessages = await this.messages.findByConversationId(conv.id);
    const outbound = allMessages
      .filter((m: any) => m.direction === 'outbound')
      .pop();

    return { reply: outbound?.content ?? 'Tidak ada balasan.' };
  }
}
