import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
