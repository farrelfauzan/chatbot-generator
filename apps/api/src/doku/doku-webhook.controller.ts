import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DokuService } from './doku.service';
import { OrdersService } from '../orders/orders.service';
import { GowaService } from '../gowa/gowa.service';
import { PrismaService } from '../database/prisma.service';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { appConfig } from '../app.config';
import {
  InvoiceService,
  type InvoiceOrderData,
} from '../invoice/invoice.service';

/**
 * Receives DOKU payment notification callbacks (Non-SNAP format).
 * DOKU sends POST to this endpoint after a payment is completed.
 *
 * Notification URL must be set in DOKU Dashboard → Settings → Payment Settings.
 */
@ApiTags('DOKU Webhooks')
@Controller('webhooks/doku')
export class DokuWebhookController {
  private readonly logger = new Logger(DokuWebhookController.name);

  constructor(
    private readonly doku: DokuService,
    private readonly orders: OrdersService,
    private readonly gowa: GowaService,
    private readonly prisma: PrismaService,
    private readonly chatSession: ChatSessionService,
    private readonly invoice: InvoiceService,
  ) {}

  /**
   * DOKU Non-SNAP notification handler.
   * Common body shape across VA, Credit Card, E-wallet, QRIS, etc.:
   * {
   *   order: { invoice_number, amount },
   *   transaction: { status: "SUCCESS"|"FAILED", date, original_request_id },
   *   service: { id },
   *   channel: { id },
   *   ...
   * }
   */
  @Post('notify')
  @HttpCode(200)
  async handleNotification(
    @Req() req: any,
    @Body() body: any,
    @Headers('client-id') clientId: string,
    @Headers('request-id') requestId: string,
    @Headers('request-timestamp') requestTimestamp: string,
    @Headers('signature') signature: string,
  ) {
    this.logger.log(
      `DOKU webhook received! Full body: ${JSON.stringify(body)}`,
    );
    this.logger.log(
      `DOKU headers: client-id=${clientId}, request-id=${requestId}, timestamp=${requestTimestamp}, signature=${signature?.substring(0, 30)}...`,
    );
    this.logger.log(
      `DOKU notification: invoice=${body?.order?.invoice_number}, status=${body?.transaction?.status}, channel=${body?.channel?.id}`,
    );

    // 1. Verify signature using raw body (not re-serialized JSON)
    if (signature && requestId && requestTimestamp) {
      const rawBody = req.rawBody;
      const bodyStr = rawBody ? rawBody.toString('utf8') : JSON.stringify(body);
      const requestTarget = '/webhooks/doku/notify';
      const valid = this.doku.verifyWebhookSignature(
        signature,
        bodyStr,
        requestId,
        requestTimestamp,
        requestTarget,
      );
      if (!valid) {
        this.logger.warn(
          'DOKU notification signature verification failed — processing anyway',
        );
      }
    }

    const invoiceNumber = body?.order?.invoice_number;
    const txStatus = body?.transaction?.status;

    if (!invoiceNumber) {
      this.logger.warn('DOKU notification missing invoice_number');
      return { status: 'ok' };
    }

    // 2. Find the order by invoice_number (= orderNumber)
    const order = await this.prisma.client.order.findUnique({
      where: { orderNumber: invoiceNumber },
      include: { customer: true, items: true },
    });

    if (!order) {
      this.logger.warn(`Order not found for invoice: ${invoiceNumber}`);
      return { status: 'ok' };
    }

    // 3. Handle payment status
    if (txStatus === 'SUCCESS') {
      // Idempotency guard — skip if already paid (DOKU may send duplicate webhooks)
      if (order.paymentStatus === 'paid') {
        this.logger.warn(
          `Duplicate DOKU webhook for ${invoiceNumber} — already paid, skipping`,
        );
        return { status: 'ok', duplicate: true };
      }

      // Update order payment status
      await this.prisma.client.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          status: 'confirmed',
        },
      });

      this.logger.log(
        `Payment confirmed for ${invoiceNumber}, customer: ${order.customer.phoneNumber}`,
      );

      // 4. Send WhatsApp confirmation to customer
      const channelId = body?.channel?.id ?? 'Online Payment';
      const amount = Number(order.totalAmount);
      const formattedAmount = 'Rp ' + amount.toLocaleString('id-ID');

      const message = [
        '✅ *Pembayaran Berhasil!*',
        '',
        `No. Pesanan: *${order.orderNumber}*`,
        `Total: *${formattedAmount}*`,
        `Metode: ${this.formatChannelName(channelId)}`,
        '',
        'Pesanan kaka sedang kami proses dan akan segera dikirim ya 📦',
        '',
        'Terima kasih sudah berbelanja! 🙏',
      ].join('\n');

      try {
        await this.gowa.sendText(order.customer.phoneNumber, message);
        this.logger.log(
          `Payment confirmation sent to ${order.customer.phoneNumber}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send payment confirmation: ${(err as Error).message}`,
        );
      }

      // 5. Generate and send PDF invoice
      try {
        const invoiceData: InvoiceOrderData = {
          orderNumber: order.orderNumber,
          paidAt: new Date(),
          items: order.items.map((item) => ({
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
          subtotal: Number(order.subtotal),
          discountAmount: Number(order.discountAmount),
          shippingAmount: Number(order.shippingAmount),
          taxAmount: Number(order.taxAmount),
          totalAmount: Number(order.totalAmount),
          customerName: order.customer.name || 'Customer',
          customerPhone: order.customer.phoneNumber,
          recipientName: order.recipientName ?? undefined,
          recipientPhone: order.recipientPhone ?? undefined,
          recipientAddress: order.recipientAddress ?? undefined,
        };

        const { buffer, filename } =
          await this.invoice.generateInvoice(invoiceData);
        await this.gowa.sendFile(
          order.customer.phoneNumber,
          buffer,
          `Invoice-${order.orderNumber}.pdf`,
          `Invoice ${order.orderNumber}`,
        );
        this.logger.log(
          `Invoice PDF sent to ${order.customer.phoneNumber}: ${filename}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to generate/send invoice: ${(err as Error).message}`,
        );
      }

      // 6. Store payment inside google sheets (only success payments)
      await this.sendPaymentToDUSSheet(order);

      // End the chat session and close conversation — payment flow is complete
      await this.chatSession.deleteSession(order.customer.phoneNumber);
      if (order.conversationId) {
        await this.prisma.client.conversation.update({
          where: { id: order.conversationId },
          data: {
            status: 'closed',
            closedAt: new Date(),
            closeReason: 'payment_completed',
          },
        });
      }
      this.logger.log(
        `Session ended and conversation closed for ${order.customer.phoneNumber} after payment`,
      );
    } else if (txStatus === 'FAILED') {
      await this.prisma.client.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'failed' },
      });

      this.logger.warn(`Payment failed for ${invoiceNumber}`);
    }

    return { status: 'ok' };
  }

  private async sendPaymentToDUSSheet(order: any) {
    const { baseUrl, username, password } = appConfig.n8n;
    if (!baseUrl) {
      this.logger.debug('N8N DUS webhook not configured; skipping sheet sync');
      return;
    }

    let webhookUrl: string;
    try {
      webhookUrl = new URL('/webhook/dus', baseUrl).toString();
    } catch (err) {
      this.logger.error(`Invalid N8N base URL for DUS sheet sync: ${baseUrl}`);
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const quantity = items.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) || 0),
      0,
    );
    const orderDescription = this.buildDUSOrderDescription(order);

    const payload = {
      action: 'create',
      data: {
        'Nama Pembeli': order.customer?.name ?? 'Unknown',
        'No HP Pembeli': order.customer?.phoneNumber ?? '',
        Alamat: order.recipientAddress ?? '',
        Order: orderDescription,
        Jumlah: quantity,
        Harga: Number(order.totalAmount),
        Status: 'Paid',
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (username && password) {
      headers.Authorization = `Basic ${Buffer.from(
        `${username}:${password}`,
      ).toString('base64')}`;
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const bodyText = await res.text();
      if (!res.ok) {
        this.logger.warn(
          `Failed to sync order ${order.orderNumber} to DUS sheet: HTTP ${res.status} ${bodyText}`,
        );
        return;
      }

      this.logger.log(
        `DUS sheet sync succeeded for order ${order.orderNumber}`,
      );
    } catch (err) {
      this.logger.error(
        `Error syncing order ${order.orderNumber} to DUS sheet: ${(err as Error).message}`,
      );
    }
  }

  private buildDUSOrderDescription(order: any): string {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.map((item: any) => {
      const quantity = Number(item.quantity) || 0;
      return `${quantity}× ${item.productNameSnapshot}`.trim();
    });

    const description = itemLines.filter(Boolean).join(' | ');
    return description
      ? `#${order.orderNumber}: ${description}`
      : `Order ${order.orderNumber}`;
  }

  private formatChannelName(channelId: string): string {
    const map: Record<string, string> = {
      CREDIT_CARD: 'Kartu Kredit',
      VIRTUAL_ACCOUNT_BCA: 'VA BCA',
      VIRTUAL_ACCOUNT_BANK_MANDIRI: 'VA Mandiri',
      VIRTUAL_ACCOUNT_BRI: 'VA BRI',
      VIRTUAL_ACCOUNT_BNI: 'VA BNI',
      VIRTUAL_ACCOUNT_BANK_PERMATA: 'VA Permata',
      VIRTUAL_ACCOUNT_DOKU: 'VA DOKU',
      VIRTUAL_ACCOUNT_BANK_CIMB: 'VA CIMB',
      VIRTUAL_ACCOUNT_BANK_DANAMON: 'VA Danamon',
      VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI: 'VA BSI',
      EMONEY_SHOPEE_PAY: 'ShopeePay',
      EMONEY_OVO: 'OVO',
      EMONEY_DANA: 'DANA',
      EMONEY_LINKAJA: 'LinkAja',
      EMONEY_DOKU: 'DOKU Wallet',
      QRIS_DOKU: 'QRIS',
      QRIS: 'QRIS',
      ONLINE_TO_OFFLINE_ALFA: 'Alfamart',
      ONLINE_TO_OFFLINE_INDOMARET: 'Indomaret',
      DIRECT_DEBIT_BRI: 'Direct Debit BRI',
      PEER_TO_PEER_AKULAKU: 'Akulaku',
      PEER_TO_PEER_KREDIVO: 'Kredivo',
    };
    return map[channelId] || channelId;
  }
}
