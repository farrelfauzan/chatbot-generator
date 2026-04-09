import { Injectable, Logger } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { IntentService } from '../intent/intent.service';
import { CatalogService } from '../catalog/catalog.service';
import { FaqService } from '../faq/faq.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { LlmService } from '../llm/llm.service';
import { GowaService } from '../gowa/gowa.service';
import type {
  GowaInboundMessage,
  ChatIntent,
} from '@chatbot-generator/shared-types';

@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  constructor(
    private readonly customers: CustomersService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly intent: IntentService,
    private readonly catalog: CatalogService,
    private readonly faq: FaqService,
    private readonly recommendation: RecommendationService,
    private readonly orders: OrdersService,
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly llm: LlmService,
    private readonly gowa: GowaService,
  ) {}

  async handleInboundMessage(payload: GowaInboundMessage): Promise<void> {
    // 1. Upsert customer (include sender name from WhatsApp if available)
    const customer = await this.customers.upsertByPhone(payload.phone, {
      ...(payload.senderName ? { name: payload.senderName } : {}),
    });

    // 2. Find or create active conversation
    const conversation = await this.conversations.findOrCreateActive(
      customer.id,
    );

    // 3. Store inbound message
    await this.messages.storeInbound(conversation.id, payload.message, {
      gatewayMessageId: payload.messageId,
      rawPayload: payload as any,
    });

    await this.conversations.touchInbound(conversation.id);

    // 4. Classify intent
    const classification = await this.intent.classify(
      payload.message,
      conversation.stage,
    );

    this.logger.log(
      `Intent: ${classification.intent} (${classification.confidence}) | Stage: ${conversation.stage}`,
    );

    // 5. Route to handler
    const reply = await this.routeToHandler(
      classification.intent,
      payload.message,
      customer,
      conversation,
      classification.entities,
    );

    // 6. Store outbound message
    await this.messages.storeOutbound(conversation.id, reply);
    await this.conversations.touchOutbound(conversation.id);

    // 7. Send via GoWa
    await this.gowa.sendText(payload.phone, reply);
  }

  private async routeToHandler(
    intent: ChatIntent,
    message: string,
    customer: any,
    conversation: any,
    entities?: Record<string, unknown>,
  ): Promise<string> {
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(customer);

      case 'browse_catalog':
        return this.handleBrowseCatalog(
          entities?.category as string | undefined,
        );

      case 'ask_stock':
      case 'ask_price':
      case 'ask_product_detail':
        return this.handleProductQuestion(message, customer, conversation);

      case 'ask_recommendation':
        return this.handleRecommendation(message, customer, conversation);

      case 'calculate_price':
        return this.handlePricing(message, customer, conversation);

      case 'create_order':
        return this.handleCreateOrder(message, customer, conversation);

      case 'request_invoice':
        return this.handleRequestInvoice(customer, conversation);

      case 'confirm_payment':
        return this.handleConfirmPayment(message, customer, conversation);

      case 'ask_order_status':
        return this.handleOrderStatus(customer);

      case 'request_human_help':
        return 'Tentu, saya akan menghubungkan Anda dengan tim kami. Mohon tunggu sebentar. 🙏';

      case 'objection_or_hesitation':
        return this.handleObjection(message, customer, conversation);

      default:
        return this.handleGeneralQA(message, customer, conversation);
    }
  }

  private async handleGreeting(customer: any): Promise<string> {
    const name = customer.name ?? 'Kak';
    return (
      `Halo ${name}! 👋 Selamat datang!\n\n` +
      `Saya bisa membantu Anda untuk:\n` +
      `• Lihat katalog produk\n` +
      `• Tanya stok & harga\n` +
      `• Rekomendasi produk\n` +
      `• Hitung total belanja\n` +
      `• Pesan produk\n\n` +
      `Silakan ketik apa yang Anda butuhkan 😊`
    );
  }

  private async handleBrowseCatalog(category?: string): Promise<string> {
    const products = await this.catalog.listActive(category);

    if (products.length === 0) {
      return category
        ? `Maaf, belum ada produk di kategori "${category}".`
        : 'Maaf, katalog sedang kosong saat ini.';
    }

    const lines = products
      .slice(0, 10)
      .map(
        (p, i) =>
          `${i + 1}. *${p.name}*\n   Harga: Rp ${Number(p.price).toLocaleString('id-ID')}\n   Stok: ${p.stockQty > 0 ? `${p.stockQty} tersedia` : 'Habis'}`,
      );

    return `📦 *Katalog Produk*${category ? ` (${category})` : ''}\n\n${lines.join('\n\n')}\n\nKetik nama produk untuk detail lebih lanjut.`;
  }

  private async handleProductQuestion(
    message: string,
    customer: any,
    conversation: any,
  ): Promise<string> {
    const products = await this.catalog.listActive();

    if (products.length === 0) {
      return 'Maaf, katalog produk kami sedang kosong. Silakan hubungi tim kami untuk informasi lebih lanjut. 🙏';
    }

    const faqEntries = await this.faq.listActive();

    return this.llm.generateGroundedReply(message, {
      conversationStage: conversation.stage,
      customerName: customer.name,
      products: products.map((p) => ({
        name: p.name,
        price: Number(p.price),
        stockQty: p.stockQty,
        category: p.category,
        description: p.description,
      })),
      faq: faqEntries.map((f) => ({ question: f.question, answer: f.answer })),
    });
  }

  private async handleRecommendation(
    message: string,
    customer: any,
    conversation: any,
  ): Promise<string> {
    const result = await this.recommendation.recommend(
      message,
      customer.id,
      conversation.id,
    );

    if (!result) {
      return 'Maaf, saat ini saya belum bisa menemukan produk yang sesuai. Bisa ceritakan lebih detail kebutuhan Anda?';
    }

    return result.explanation;
  }

  private async handlePricing(
    message: string,
    _customer: any,
    conversation: any,
  ): Promise<string> {
    const products = await this.catalog.listActive();

    return this.llm.generateGroundedReply(message, {
      conversationStage: conversation.stage,
      customerName: _customer.name,
      products: products.map((p) => ({
        name: p.name,
        price: Number(p.price),
        stockQty: p.stockQty,
      })),
    });
  }

  private async handleCreateOrder(
    message: string,
    customer: any,
    conversation: any,
  ): Promise<string> {
    const products = await this.catalog.listActive();

    if (products.length === 0) {
      return 'Maaf, katalog produk kami sedang kosong saat ini. Belum bisa membuat pesanan. 🙏';
    }

    // Use LLM to match product name and quantity from the message
    const requirements = await this.llm.extractRequirements(message);
    const searchTerm = requirements.category ?? requirements.useCase ?? message;

    const matches = await this.catalog.search(searchTerm);

    if (matches.length === 0) {
      const productList = products
        .slice(0, 10)
        .map(
          (p) => `• ${p.name} - Rp ${Number(p.price).toLocaleString('id-ID')}`,
        )
        .join('\n');

      return (
        `Maaf, saya tidak menemukan produk yang cocok dengan "${searchTerm}".\n\n` +
        `Produk yang tersedia:\n${productList}\n\n` +
        `Silakan kirim nama produk yang sesuai beserta jumlahnya.`
      );
    }

    const product = matches[0];
    const qty = requirements.quantity ?? 1;
    const total = product.price * qty;

    // Create the order
    try {
      const order = await this.orders.create({
        customerId: customer.id,
        conversationId: conversation.id,
        items: [{ productId: product.id, quantity: qty }],
      });

      await this.conversations.update(conversation.id, {
        stage: 'order_confirm',
      });

      return (
        `✅ *Pesanan dibuat!*\n\n` +
        `No. Pesanan: *${order.orderNumber}*\n` +
        `Produk: ${product.name}\n` +
        `Jumlah: ${qty}\n` +
        `Harga satuan: Rp ${Number(product.price).toLocaleString('id-ID')}\n` +
        `*Total: Rp ${Number(order.totalAmount).toLocaleString('id-ID')}*\n\n` +
        `Ketik "invoice" untuk menerima invoice, atau "batal" untuk membatalkan.`
      );
    } catch (err) {
      this.logger.error('Failed to create order', err);
      return 'Maaf, terjadi kesalahan saat membuat pesanan. Silakan coba lagi.';
    }
  }

  private async handleRequestInvoice(
    customer: any,
    conversation: any,
  ): Promise<string> {
    const latestOrder = await this.orders.findLatestByCustomerId(customer.id);

    if (!latestOrder) {
      return 'Anda belum memiliki pesanan. Silakan buat pesanan terlebih dahulu.';
    }

    const invoice = await this.invoices.generateForOrder(
      latestOrder.id,
      customer.id,
    );
    return `Invoice *${invoice.invoiceNumber}* telah dibuat.\nTotal: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}\n\nSilakan lakukan pembayaran dan kirimkan bukti transfer.`;
  }

  private async handleConfirmPayment(
    message: string,
    customer: any,
    _conversation: any,
  ): Promise<string> {
    const latestOrder = await this.orders.findLatestByCustomerId(customer.id);

    if (!latestOrder) {
      return 'Maaf, saya tidak menemukan pesanan aktif untuk dikonfirmasi pembayarannya.';
    }

    await this.payments.create({
      orderId: latestOrder.id,
      customerId: customer.id,
      amount: Number(latestOrder.totalAmount),
      referenceNumber: message.trim(),
    });

    return 'Terima kasih! Konfirmasi pembayaran Anda telah diterima. Tim kami akan memverifikasi dalam waktu dekat. 🙏';
  }

  private async handleOrderStatus(customer: any): Promise<string> {
    const latestOrder = await this.orders.findLatestByCustomerId(customer.id);

    if (!latestOrder) {
      return 'Anda belum memiliki pesanan.';
    }

    return (
      `📋 *Status Pesanan ${latestOrder.orderNumber}*\n` +
      `Status: ${latestOrder.status}\n` +
      `Total: Rp ${Number(latestOrder.totalAmount).toLocaleString('id-ID')}`
    );
  }

  private async handleObjection(
    message: string,
    customer: any,
    conversation: any,
  ): Promise<string> {
    const products = await this.catalog.listActive();

    return this.llm.generateGroundedReply(
      `Customer is hesitating: "${message}". Help address the concern and guide toward a purchase.`,
      {
        conversationStage: conversation.stage,
        customerName: customer.name,
        products: products.map((p) => ({
          name: p.name,
          price: Number(p.price),
          stockQty: p.stockQty,
        })),
      },
    );
  }

  private async handleGeneralQA(
    message: string,
    customer: any,
    conversation: any,
  ): Promise<string> {
    const products = await this.catalog.listActive();
    const faqEntries = await this.faq.listActive();

    if (products.length === 0 && faqEntries.length === 0) {
      return (
        `Terima kasih atas pertanyaannya, ${customer.name ?? 'Kak'}! ` +
        `Saat ini kami belum memiliki data produk di sistem. ` +
        `Silakan hubungi tim kami untuk informasi lebih lanjut. 🙏`
      );
    }

    return this.llm.generateGroundedReply(message, {
      conversationStage: conversation.stage,
      customerName: customer.name ?? 'Pelanggan',
      products: products.map((p) => ({
        name: p.name,
        price: Number(p.price),
        stockQty: p.stockQty,
        category: p.category,
      })),
      faq: faqEntries.map((f) => ({ question: f.question, answer: f.answer })),
    });
  }
}
