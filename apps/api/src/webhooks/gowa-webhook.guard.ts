import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appConfig } from '../app.config';

@Injectable()
export class GowaWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GowaWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const secret = appConfig.gowa.webhookSecret;

    if (!secret) return true; // skip validation in dev when no secret is set

    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-hub-signature-256'] as
      | string
      | undefined;

    if (!signature) {
      this.logger.warn('Missing X-Hub-Signature-256 header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // GOWA sends: "sha256={hex_encoded_hmac}"
    const receivedHex = signature.replace('sha256=', '');

    // Use rawBody if available (registered via @fastify/raw-body), fallback to JSON.stringify
    const body: Buffer | string =
      request.rawBody ?? JSON.stringify(request.body);

    const expectedHex = createHmac('sha256', secret).update(body).digest('hex');

    try {
      const valid = timingSafeEqual(
        Buffer.from(expectedHex, 'hex'),
        Buffer.from(receivedHex, 'hex'),
      );
      if (!valid) throw new Error();
    } catch {
      this.logger.warn('Invalid webhook HMAC signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
