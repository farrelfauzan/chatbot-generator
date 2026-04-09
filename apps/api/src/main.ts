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
  const adapter = new FastifyAdapter({ bodyLimit: 1048576 });

  // Capture raw body bytes for webhook HMAC verification via preParsing hook
  adapter
    .getInstance()
    .addHook('preParsing', async (request: any, _reply: any, payload: any) => {
      const chunks: Buffer[] = [];
      for await (const chunk of payload) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks);
      request.rawBody = raw;
      // Return a new readable stream for the parser
      const { Readable } = await import('node:stream');
      return Readable.from(raw);
    });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
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
