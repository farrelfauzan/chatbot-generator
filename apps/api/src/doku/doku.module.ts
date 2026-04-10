import { Global, Module } from '@nestjs/common';
import { DokuService } from './doku.service';

@Global()
@Module({
  providers: [DokuService],
  exports: [DokuService],
})
export class DokuModule {}
