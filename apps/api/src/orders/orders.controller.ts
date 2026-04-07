import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from '../common/zod-dto';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} from '@chatbot-generator/shared-types';

const CreateOrderDto = createZodDto(createOrderSchema);
const UpdateOrderStatusDto = createZodDto(updateOrderStatusSchema);
const OrderQueryDto = createZodDto(orderQuerySchema);

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: InstanceType<typeof OrderQueryDto>) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreateOrderDto>) {
    return this.ordersService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateOrderStatusDto>,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
