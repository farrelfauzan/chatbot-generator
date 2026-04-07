import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { appConfig } from '../app.config';

@Injectable()
export class GowaWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = appConfig.gowa.webhookSecret;

    if (!secret) return true; // skip validation in dev when no secret is set

    const request = context.switchToHttp().getRequest();
    const headerSecret = request.headers['x-webhook-secret'];

    if (headerSecret !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}
