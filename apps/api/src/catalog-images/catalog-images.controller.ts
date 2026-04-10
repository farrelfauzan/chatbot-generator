import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CatalogImagesService } from './catalog-images.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';

@Controller('catalog-images')
export class CatalogImagesController {
  constructor(
    private readonly catalogImages: CatalogImagesService,
    private readonly s3: S3Service,
  ) {}

  @Get()
  findAll() {
    return this.catalogImages.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.catalogImages.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body('title') title: string,
    @Body('imageUrl') imageUrl: string,
    @Body('description') description?: string,
    @Body('sortOrder') sortOrder?: number,
  ) {
    return this.catalogImages.create({
      title,
      description,
      imageUrl,
      sortOrder: sortOrder ?? 0,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('presigned-upload')
  async getPresignedUrl(
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.s3.getPresignedUploadUrl(filename, contentType);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.catalogImages.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogImages.remove(id);
  }
}
