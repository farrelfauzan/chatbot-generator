import type {
  InvoiceResponse,
  InvoiceQuery,
} from '@chatbot-generator/shared-types';

export const INVOICE_REPOSITORY = 'IInvoiceRepository';

export interface InvoiceCreateData {
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  subtotal: number;
  totalAmount: number;
  dueAt?: Date;
}

export interface IInvoiceRepository {
  findById(id: string): Promise<InvoiceResponse | null>;
  findByOrderId(orderId: string): Promise<InvoiceResponse | null>;
  findAll(query?: InvoiceQuery): Promise<InvoiceResponse[]>;
  create(data: InvoiceCreateData): Promise<InvoiceResponse>;
  updateStatus(id: string, status: string): Promise<InvoiceResponse>;
}
