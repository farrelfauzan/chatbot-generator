import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createPaymentSchema,
  verifyPaymentSchema,
  paymentQuerySchema,
} from '@chatbot-generator/shared-types';

const CreatePaymentDto = createZodDto(createPaymentSchema);
const VerifyPaymentDto = createZodDto(verifyPaymentSchema);
const PaymentQueryDto = createZodDto(paymentQuerySchema);

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof PaymentQueryDto>) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreatePaymentDto>) {
    return this.paymentsService.create(dto);
  }

  @Patch(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof VerifyPaymentDto>,
  ) {
    return this.paymentsService.verify(id, dto);
  }
}
