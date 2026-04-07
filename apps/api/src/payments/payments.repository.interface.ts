import type {
  CreatePaymentInput,
  VerifyPaymentInput,
  PaymentResponse,
  PaymentQuery,
} from '@chatbot-generator/shared-types';

export const PAYMENT_REPOSITORY = 'IPaymentRepository';

export interface IPaymentRepository {
  findById(id: string): Promise<PaymentResponse | null>;
  findAll(query?: PaymentQuery): Promise<PaymentResponse[]>;
  create(data: CreatePaymentInput): Promise<PaymentResponse>;
  verify(id: string, data: VerifyPaymentInput): Promise<PaymentResponse>;
}
