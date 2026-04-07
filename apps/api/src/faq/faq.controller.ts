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
import { FaqService } from './faq.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createFaqSchema,
  updateFaqSchema,
  faqQuerySchema,
} from '@chatbot-generator/shared-types';

const CreateFaqDto = createZodDto(createFaqSchema);
const UpdateFaqDto = createZodDto(updateFaqSchema);
const FaqQueryDto = createZodDto(faqQuerySchema);

@ApiTags('FAQ')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof FaqQueryDto>) {
    return this.faqService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.faqService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreateFaqDto>) {
    return this.faqService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateFaqDto>,
  ) {
    return this.faqService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.faqService.delete(id);
  }
}
