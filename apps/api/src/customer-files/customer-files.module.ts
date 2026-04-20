import { Module } from '@nestjs/common';
import { CustomerFilesService } from './customer-files.service';
import { GowaModule } from '../gowa/gowa.module';

@Module({
  imports: [GowaModule],
  providers: [CustomerFilesService],
  exports: [CustomerFilesService],
})
export class CustomerFilesModule {}
