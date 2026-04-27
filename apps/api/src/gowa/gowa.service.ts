import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../app.config';

@Injectable()
export class GowaService {
  private readonly logger = new Logger(GowaService.name);
  private readonly baseUrl = appConfig.gowa.baseUrl;
  private readonly basicAuth = appConfig.gowa.basicAuth;
  private readonly deviceId = appConfig.gowa.deviceId;

  async sendText(phone: string, message: string): Promise<void> {
    await this.simulateTyping(phone, message);
    await this.post('/send/message', { phone, message });
  }

  async sendImage(
    phone: string,
    imageUrl: string,
    caption?: string,
  ): Promise<void> {
    await this.simulateTyping(phone, caption || 'image');
    await this.post('/send/image', { phone, image_url: imageUrl, caption });
  }

  async sendFile(phone: string, file: Buffer, caption?: string): Promise<void> {
    await this.simulateTyping(phone, caption || 'file');
    const url = `${this.baseUrl}/send/file`;

    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('file', new Blob([new Uint8Array(file)]), 'invoice.pdf');
    if (caption) formData.append('caption', caption);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(this.deviceId ? { 'X-Device-Id': this.deviceId } : {}),
        ...(this.basicAuth
          ? {
              Authorization: `Basic ${Buffer.from(this.basicAuth).toString('base64')}`,
            }
          : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`GoWa sendFile error ${res.status}: ${text}`);
      throw new Error(`GoWa sendFile failed: ${res.status}`);
    }
  }

  /**
   * Send typing indicator, wait proportional to message length, then stop.
   * Makes the bot appear human-like to avoid WhatsApp bot detection.
   */
  private async simulateTyping(phone: string, text: string): Promise<void> {
    try {
      await this.post('/send/chat-presence', { phone, action: 'start' });
      // ~30ms per character, clamped between 800ms and 3000ms
      const delay = Math.min(3000, Math.max(800, text.length * 30));
      await new Promise((r) => setTimeout(r, delay));
      await this.post('/send/chat-presence', { phone, action: 'stop' });
    } catch (err) {
      // Non-critical — don't block message sending if typing indicator fails
      this.logger.warn(`Typing indicator failed: ${(err as Error).message}`);
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    this.logger.debug(`GoWa → downloading media from ${mediaUrl}`);
    const res = await fetch(mediaUrl, {
      headers: {
        ...(this.basicAuth
          ? {
              Authorization: `Basic ${Buffer.from(this.basicAuth).toString('base64')}`,
            }
          : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`GoWa media download failed ${res.status}: ${text}`);
      throw new Error(`GoWa media download failed: ${res.status}`);
    }

    return Buffer.from(await res.arrayBuffer());
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
        ...(this.deviceId ? { 'X-Device-Id': this.deviceId } : {}),
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
