import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceRepository } from './invoices.repository';
import { INVOICE_REPOSITORY } from './invoices.repository.interface';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    { provide: INVOICE_REPOSITORY, useClass: InvoiceRepository },
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
