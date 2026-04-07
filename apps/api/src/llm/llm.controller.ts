import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LlmService } from './llm.service';
import { createZodDto } from '../common/zod-dto';
import { chatCompletionSchema } from '@chatbot-generator/shared-types';

const ChatCompletionDto = createZodDto(chatCompletionSchema);

@ApiTags('LLM')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('config')
  getConfig() {
    return this.llmService.getPublicConfig();
  }

  @Post('chat')
  async chat(@Body() body: InstanceType<typeof ChatCompletionDto>) {
    return this.llmService.complete(body.message);
  }
}
