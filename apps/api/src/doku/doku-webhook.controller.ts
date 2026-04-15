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
      include: { customer: true },
    });

    if (!order) {
      this.logger.warn(`Order not found for invoice: ${invoiceNumber}`);
      return { status: 'ok' };
    }

    // 3. Handle payment status
    if (txStatus === 'SUCCESS') {
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
