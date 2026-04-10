import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CardboardModule } from '../cardboard/cardboard.module';

@Module({
  imports: [CardboardModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
