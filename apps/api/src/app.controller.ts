import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): {
    name: string;
    status: string;
    llmProvider: string;
    llmModel: string;
  } {
    return this.appService.getHello();
  }
}
