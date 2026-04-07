import { Injectable } from '@nestjs/common';
import { appConfig } from './app.config';

@Injectable()
export class AppService {
  getHello(): { name: string; status: string; llmProvider: string; llmModel: string } {
    return {
      name: appConfig.appName,
      status: 'ok',
      llmProvider: appConfig.llm.provider,
      llmModel: appConfig.llm.model,
    };
  }
}
