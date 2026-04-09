import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createCategorySchema,
  updateCategorySchema,
} from '@chatbot-generator/shared-types';

const CreateCategoryDto = createZodDto(createCategorySchema);
const UpdateCategoryDto = createZodDto(updateCategorySchema);

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreateCategoryDto>) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateCategoryDto>,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
