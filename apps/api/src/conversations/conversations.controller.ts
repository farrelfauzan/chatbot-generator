import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { createZodDto } from '../common/zod-dto';
import {
  updateConversationSchema,
  conversationQuerySchema,
} from '@chatbot-generator/shared-types';

const UpdateConversationDto = createZodDto(updateConversationSchema);
const ConversationQueryDto = createZodDto(conversationQuerySchema);

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof ConversationQueryDto>) {
    return this.conversationsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateConversationDto>,
  ) {
    return this.conversationsService.update(id, dto);
  }
}
