import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../app.config';

@Injectable()
export class GowaService {
  private readonly logger = new Logger(GowaService.name);
  private readonly baseUrl = appConfig.gowa.baseUrl;
  private readonly basicAuth = appConfig.gowa.basicAuth;

  async sendText(phone: string, message: string): Promise<void> {
    await this.post('/send/message', { phone, message });
  }

  async sendImage(
    phone: string,
    imageUrl: string,
    caption?: string,
  ): Promise<void> {
    await this.post('/send/image', { phone, image_url: imageUrl, caption });
  }

  async sendDocument(
    phone: string,
    documentUrl: string,
    filename: string,
  ): Promise<void> {
    await this.post('/send/document', {
      phone,
      document_url: documentUrl,
      filename,
    });
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    this.logger.debug(`GoWa → ${path} | phone=${(body as any).phone}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.basicAuth
          ? {
              Authorization: `Basic ${Buffer.from(this.basicAuth).toString('base64')}`,
            }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`GoWa error ${res.status}: ${text}`);
      throw new Error(`GoWa request failed: ${res.status}`);
    }

    return res.json();
  }
}
