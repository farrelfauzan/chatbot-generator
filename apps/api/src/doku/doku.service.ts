import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../app.config';
import { createHash, createHmac, randomUUID } from 'crypto';

/**
 * DOKU Checkout payment gateway service.
 * Ref: https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
 */
@Injectable()
export class DokuService {
  private readonly logger = new Logger(DokuService.name);
  private readonly baseUrl = appConfig.doku.baseUrl;
  private readonly clientId = appConfig.doku.clientId;
  private readonly secretKey = appConfig.doku.secretKey;

  get isConfigured(): boolean {
    return Boolean(this.clientId && this.secretKey);
  }

  async createInvoice(params: {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    description: string;
    expiryMinutes?: number;
  }): Promise<{ invoiceUrl: string; paymentId: string } | null> {
    if (!this.isConfigured) {
      this.logger.warn('DOKU not configured — skipping invoice creation');
      return null;
    }

    const requestTarget = '/checkout/v1/payment';
    const requestId = randomUUID();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const body: Record<string, any> = {
      order: {
        amount: params.amount,
        invoice_number: params.orderId,
        currency: 'IDR',
      },
      payment: {
        payment_due_date: params.expiryMinutes ?? 60,
      },
      customer: {
        name: params.customerName,
        email: params.customerEmail || undefined,
        phone: params.customerPhone,
      },
    };

    // Add notification URL so DOKU sends payment callbacks
    if (appConfig.doku.notificationUrl) {
      body.additional_info = {
        override_notification_url: appConfig.doku.notificationUrl,
      };
    }

    const bodyStr = JSON.stringify(body);
    const signature = this.generateSignature(
      requestId,
      timestamp,
      requestTarget,
      bodyStr,
    );

    this.logger.debug(
      `DOKU createInvoice: ${params.orderId}, amount=${params.amount}`,
    );

    const res = await fetch(`${this.baseUrl}${requestTarget}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': this.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        Signature: signature,
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`DOKU createInvoice failed ${res.status}: ${text}`);
      return null;
    }

    const data = (await res.json()) as any;

    if (data.message?.[0] !== 'SUCCESS') {
      this.logger.error(
        `DOKU createInvoice error: ${JSON.stringify(data.error_messages ?? data.message)}`,
      );
      return null;
    }

    return {
      invoiceUrl: data.response?.payment?.url ?? '',
      paymentId: data.response?.order?.invoice_number ?? params.orderId,
    };
  }

  verifyWebhookSignature(
    signature: string,
    body: string,
    requestId: string,
    timestamp: string,
    requestTarget: string,
  ): boolean {
    if (!this.isConfigured) return false;

    // DOKU notification signature requires Request-Target (the path of the notification URL)
    const digest = this.sha256Base64(body);
    const component = [
      `Client-Id:${this.clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${requestTarget}`,
      `Digest:${digest}`,
    ].join('\n');

    const expected = createHmac('sha256', this.secretKey)
      .update(component)
      .digest('base64');

    return `HMACSHA256=${expected}` === signature;
  }

  /**
   * Generate DOKU Checkout signature.
   * Component: Client-Id + Request-Id + Request-Timestamp + Request-Target + Digest
   * Digest = SHA-256(requestBody) base64-encoded
   * Signature = HMACSHA256(secretKey, component)
   */
  private generateSignature(
    requestId: string,
    timestamp: string,
    requestTarget: string,
    bodyStr: string,
  ): string {
    const digest = this.sha256Base64(bodyStr);

    const component = [
      `Client-Id:${this.clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${requestTarget}`,
      `Digest:${digest}`,
    ].join('\n');

    const hmac = createHmac('sha256', this.secretKey)
      .update(component)
      .digest('base64');

    return `HMACSHA256=${hmac}`;
  }

  private sha256Base64(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('base64');
  }
}
