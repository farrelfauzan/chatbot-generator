import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './payments.repository';
import { PAYMENT_REPOSITORY } from './payments.repository.interface';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
