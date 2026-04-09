import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { AppModule } from './app.module';
import { appConfig } from './app.config';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1048576 }),
  );

  app.useGlobalPipes(new ZodValidationPipe());

  await app.register(import('@fastify/cors'), {
    origin: true,
  });

  // ─── Swagger UI from openapi.yaml ──────────────────
  const yamlPath = join(__dirname, '..', '..', 'openapi.yaml');
  const document = load(readFileSync(yamlPath, 'utf8')) as Record<string, any>;
  SwaggerModule.setup('api-docs', app, () => document as any);

  await app.listen({
    port: appConfig.port,
    host: '0.0.0.0',
  });
}

bootstrap();
