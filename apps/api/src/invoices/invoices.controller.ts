import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { createZodDto } from '../common/zod-dto';
import { invoiceQuerySchema } from '@chatbot-generator/shared-types';

const InvoiceQueryDto = createZodDto(invoiceQuerySchema);

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof InvoiceQueryDto>) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }
}
