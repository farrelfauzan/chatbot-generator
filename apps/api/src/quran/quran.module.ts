import { Module } from '@nestjs/common';
import { AlQuranProvider } from './alquran.provider';
import { QuranService } from './quran.service';

@Module({
  providers: [AlQuranProvider, QuranService],
  exports: [QuranService],
})
export class QuranModule {}
