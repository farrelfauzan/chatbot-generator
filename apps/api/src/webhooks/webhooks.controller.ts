import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GowaWebhookGuard } from './gowa-webhook.guard';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import { createZodDto } from '../common/zod-dto';
import {
  gowaInboundMessageSchema,
  gowaStatusUpdateSchema,
} from '@chatbot-generator/shared-types';

const InboundMessageDto = createZodDto(gowaInboundMessageSchema);
const StatusUpdateDto = createZodDto(gowaStatusUpdateSchema);

@ApiTags('Webhooks')
@Controller('webhooks/gowa')
@UseGuards(GowaWebhookGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly orchestrator: ConversationOrchestratorService) {}

  @Post('messages')
  async handleInboundMessage(
    @Body() body: InstanceType<typeof InboundMessageDto>,
  ) {
    this.logger.log(
      `Inbound from ${body.phone}: ${body.message.substring(0, 80)}`,
    );
    await this.orchestrator.handleInboundMessage(body);
    return { status: 'ok' };
  }

  @Post('status')
  async handleStatusUpdate(@Body() body: InstanceType<typeof StatusUpdateDto>) {
    this.logger.debug(`Status update: ${body.messageId} → ${body.status}`);
    return { status: 'ok' };
  }
}
