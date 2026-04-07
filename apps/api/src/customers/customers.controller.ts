import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { createZodDto } from '../common/zod-dto';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from '@chatbot-generator/shared-types';

const CreateCustomerDto = createZodDto(createCustomerSchema);
const UpdateCustomerDto = createZodDto(updateCustomerSchema);

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post()
  create(@Body() dto: InstanceType<typeof CreateCustomerDto>) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: InstanceType<typeof UpdateCustomerDto>,
  ) {
    return this.customersService.update(id, dto);
  }
}
