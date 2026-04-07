import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PromptTemplateService } from './prompt-template.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createPromptTemplateSchema,
  updatePromptTemplateSchema,
  promptTemplateQuerySchema,
} from '@chatbot-generator/shared-types';

const CreatePromptTemplateDto = createZodDto(createPromptTemplateSchema);
const UpdatePromptTemplateDto = createZodDto(updatePromptTemplateSchema);
const PromptTemplateQueryDto = createZodDto(promptTemplateQuerySchema);

@ApiTags('PromptTemplates')
@Controller('prompt-templates')
export class PromptTemplateController {
  constructor(private readonly service: PromptTemplateService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof PromptTemplateQueryDto>) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreatePromptTemplateDto>) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdatePromptTemplateDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
