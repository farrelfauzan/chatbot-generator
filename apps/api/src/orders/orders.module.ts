import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './orders.repository';
import { ORDER_REPOSITORY } from './orders.repository.interface';

@Module({
  imports: [],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDER_REPOSITORY, useClass: OrderRepository },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
