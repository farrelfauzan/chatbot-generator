import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  type IInvoiceRepository,
} from './invoices.repository.interface';
import type { InvoiceQuery } from '@chatbot-generator/shared-types';
import { randomBytes } from 'crypto';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepo: IInvoiceRepository,
  ) {}

  async findAll(query?: InvoiceQuery) {
    return this.invoiceRepo.findAll(query);
  }

  async findById(id: string) {
    const inv = await this.invoiceRepo.findById(id);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async generateForOrder(orderId: string, customerId: string) {
    const existing = await this.invoiceRepo.findByOrderId(orderId);
    if (existing) return existing;

    const invoiceNumber = `INV-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    // Get order to get amounts – simplified: caller should pass amounts
    // For MVP, pass through orderId and we read from the repo context
    return this.invoiceRepo.create({
      invoiceNumber,
      orderId,
      customerId,
      subtotal: 0, // will be overridden by the orchestrator with real data
      totalAmount: 0,
    });
  }

  async generateForOrderWithAmounts(
    orderId: string,
    customerId: string,
    subtotal: number,
    totalAmount: number,
  ) {
    const existing = await this.invoiceRepo.findByOrderId(orderId);
    if (existing) return existing;

    const invoiceNumber = `INV-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    return this.invoiceRepo.create({
      invoiceNumber,
      orderId,
      customerId,
      subtotal,
      totalAmount,
    });
  }
}
