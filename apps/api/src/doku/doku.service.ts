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
  }): Promise<DokuInvoiceResult> {
    if (!this.isConfigured) {
      this.logger.warn('DOKU not configured — skipping invoice creation');
      return { ok: false, error: 'NOT_CONFIGURED' };
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

    const [fetchErr, res] = await this.safeFetch(
      `${this.baseUrl}${requestTarget}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': this.clientId,
          'Request-Id': requestId,
          'Request-Timestamp': timestamp,
          Signature: signature,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (fetchErr) {
      const isTimeout =
        fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
      const code: DokuErrorCode = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
      this.logger.error(
        `DOKU createInvoice ${code} for order ${params.orderId}: ${fetchErr.message}`,
      );
      return { ok: false, error: code };
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `DOKU createInvoice failed for order ${params.orderId} — HTTP ${res.status}: ${text}`,
      );
      return { ok: false, error: 'HTTP_ERROR', httpStatus: res.status };
    }

    const [parseErr, data] = await this.safeJson(res);

    if (parseErr) {
      this.logger.error(
        `DOKU createInvoice returned invalid JSON for order ${params.orderId}`,
      );
      return { ok: false, error: 'INVALID_RESPONSE' };
    }

    if (data.message?.[0] !== 'SUCCESS') {
      const errorDetail = JSON.stringify(data.error_messages ?? data.message);
      this.logger.error(
        `DOKU createInvoice rejected for order ${params.orderId}: ${errorDetail}`,
      );
      return { ok: false, error: 'REJECTED' };
    }

    const invoiceUrl = data.response?.payment?.url;
    if (!invoiceUrl) {
      this.logger.error(
        `DOKU createInvoice returned SUCCESS but no payment URL for order ${params.orderId}`,
      );
      return { ok: false, error: 'MISSING_URL' };
    }

    return {
      ok: true,
      invoiceUrl,
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

  private async safeFetch(
    url: string,
    init: RequestInit,
  ): Promise<[Error, null] | [null, Response]> {
    try {
      return [null, await fetch(url, init)];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async safeJson(res: Response): Promise<[Error, null] | [null, any]> {
    try {
      return [null, await res.json()];
    } catch (err) {
      return [err as Error, null];
    }
  }
}

export type DokuErrorCode =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'REJECTED'
  | 'MISSING_URL';

export type DokuInvoiceResult =
  | { ok: true; invoiceUrl: string; paymentId: string }
  | { ok: false; error: DokuErrorCode; httpStatus?: number };
