import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
