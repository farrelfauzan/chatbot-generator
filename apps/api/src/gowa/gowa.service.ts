import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../app.config';

@Injectable()
export class GowaService {
  private readonly logger = new Logger(GowaService.name);
  private readonly baseUrl = appConfig.gowa.baseUrl;
  private readonly basicAuth = appConfig.gowa.basicAuth;
  private deviceId = '';
  private deviceIdFetched = false;

  private async getDeviceId(): Promise<string> {
    if (this.deviceIdFetched) return this.deviceId;
    await this.fetchDeviceId();
    return this.deviceId;
  }

  private async fetchDeviceId(): Promise<void> {
    try {
      const url = `${this.baseUrl}/devices`;
      const res = await fetch(url, {
        headers: {
          ...(this.basicAuth
            ? {
                Authorization: `Basic ${Buffer.from(this.basicAuth).toString('base64')}`,
              }
            : {}),
        },
      });

      if (!res.ok) {
        this.logger.error(`Failed to fetch devices from GOWA: ${res.status}`);
        return;
      }

      const data = (await res.json()) as {
        results?: Array<{ id: string }>;
      };

      if (data.results && data.results.length > 0) {
        this.deviceId = data.results[0].id;
        this.deviceIdFetched = true;
        this.logger.log(`Resolved GOWA device ID: ${this.deviceId}`);
      } else {
        this.logger.warn('No devices found in GOWA');
      }
    } catch (err) {
      this.logger.error(
        `Failed to fetch device ID from GOWA: ${(err as Error).message}`,
      );
    }
  }

  async sendText(phone: string, message: string): Promise<void> {
    await this.simulateTyping(phone, message);
    await this.post('/send/message', { phone, message });
  }

  async sendImage(
    phone: string,
    imageUrl: string,
    caption?: string,
  ): Promise<void> {
    await this.simulateTyping(phone, 'image');
    await this.post('/send/image', {
      phone,
      image_url: imageUrl,
      caption: caption ?? '',
    });
  }

  async sendFile(
    phone: string,
    file: Buffer,
    filename: string,
    caption?: string,
  ): Promise<void> {
    await this.simulateTyping(phone, caption || 'file');
    const url = `${this.baseUrl}/send/file`;

    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('file', new Blob([new Uint8Array(file)]), filename);
    if (caption) formData.append('caption', '');

    const deviceId = await this.getDeviceId();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
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

    const deviceId = await this.getDeviceId();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
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
