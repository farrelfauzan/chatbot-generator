import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CardboardService } from './cardboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';

@Controller('cardboard')
export class CardboardController {
  constructor(
    private readonly cardboard: CardboardService,
    private readonly s3: S3Service,
  ) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('material') material?: string,
    @Query('readyStock') readyStock?: string,
  ) {
    return this.cardboard.findAll({
      type,
      material,
      isReadyStock: readyStock === 'true' ? true : undefined,
    });
  }

  @Get('ready-stock')
  findReadyStock() {
    return this.cardboard.findReadyStock();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.cardboard.search(q ?? '');
  }

  @Get('match')
  findClosest(
    @Query('p') p: string,
    @Query('l') l: string,
    @Query('t') t: string,
    @Query('material') material?: string,
  ) {
    return this.cardboard.findClosestMatch(
      Number(p),
      Number(l),
      Number(t),
      material,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.cardboard.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: any) {
    return this.cardboard.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.cardboard.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardboard.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/image')
  async uploadImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    await this.cardboard.update(id, { imageUrl });
    return { imageUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post('presigned-upload')
  async getPresignedUrl(
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.s3.getPresignedUploadUrl(filename, contentType);
  }
}
