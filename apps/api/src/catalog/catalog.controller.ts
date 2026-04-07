import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '@chatbot-generator/shared-types';

const CreateProductDto = createZodDto(createProductSchema);
const UpdateProductDto = createZodDto(updateProductSchema);
const ProductQueryDto = createZodDto(productQuerySchema);

@ApiTags('Products')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof ProductQueryDto>) {
    return this.catalogService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.catalogService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreateProductDto>) {
    return this.catalogService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateProductDto>,
  ) {
    return this.catalogService.update(id, dto);
  }
}
