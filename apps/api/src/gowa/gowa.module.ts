import { Module } from '@nestjs/common';
import { GowaService } from './gowa.service';

@Module({
  providers: [GowaService],
  exports: [GowaService],
})
export class GowaModule {}
