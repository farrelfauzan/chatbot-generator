import { Module } from '@nestjs/common';
import { CardboardService } from './cardboard.service';
import { CardboardController } from './cardboard.controller';

@Module({
  controllers: [CardboardController],
  providers: [CardboardService],
  exports: [CardboardService],
})
export class CardboardModule {}
