import { Module } from '@nestjs/common';
import { GowaProvider } from './gowa.provider';

@Module({
  providers: [GowaProvider],
  exports: [GowaProvider],
})
export class GowaModule {}
