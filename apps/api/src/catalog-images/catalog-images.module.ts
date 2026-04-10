import { Module } from '@nestjs/common';
import { CatalogImagesService } from './catalog-images.service';
import { CatalogImagesController } from './catalog-images.controller';

@Module({
  controllers: [CatalogImagesController],
  providers: [CatalogImagesService],
  exports: [CatalogImagesService],
})
export class CatalogImagesModule {}
