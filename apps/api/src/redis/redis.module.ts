import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { appConfig } from '../app.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis(appConfig.redis.url, {
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
