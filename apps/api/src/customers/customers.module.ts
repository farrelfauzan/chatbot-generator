import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerRepository } from './customers.repository';
import { CUSTOMER_REPOSITORY } from './customers.repository.interface';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepository },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
