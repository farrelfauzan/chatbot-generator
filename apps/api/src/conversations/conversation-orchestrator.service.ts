import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CatalogService } from '../catalog/catalog.service';
import { FaqService } from '../faq/faq.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { GowaService } from '../gowa/gowa.service';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { SettingsService } from '../settings/settings.service';
import { appConfig } from '../app.config';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

// ─── Tool definitions for function calling ────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search products by name, keyword, or category. Use when the customer asks about a specific product, wants to browse, or mentions a product name.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search keyword: product name, category, or description keyword',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_catalog',
      description:
        'List all active products in the catalog. Omit the category parameter to list ALL products across all categories. Use when the customer wants to see what is available, says "semua", picks menu option 1, or says "katalog".',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'Optional category filter (e.g. Laptop, PC, Monitor, Accessories). Leave empty to list ALL products.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_detail',
      description:
        'Get full details of a specific product by its exact name. Use when the customer asks for specs, stock, or price of a known product.',
      parameters: {
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'The exact or partial name of the product',
          },
        },
        required: ['product_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description:
        'Create a purchase order for a customer. Supports ordering one or multiple products at once. Use when the customer explicitly confirms they want to buy/order.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of products to order',
            items: {
              type: 'object',
              properties: {
                product_name: {
                  type: 'string',
                  description: 'Name of the product to order',
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity to order (default 1)',
                },
              },
              required: ['product_name'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description:
        'Get the latest order status for the current customer. Use when the customer asks about their order.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_invoice',
      description:
        'Generate an invoice for the latest order. Use when the customer requests an invoice or bill.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_payment',
      description:
        'Confirm payment for the latest order. Use when the customer says they have paid or sends proof of transfer.',
      parameters: {
        type: 'object',
        properties: {
          reference: {
            type: 'string',
            description: 'Payment reference or note from the customer',
          },
        },
        required: ['reference'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_faq',
      description:
        'Get FAQ answers. Use when the customer has general questions about shipping, warranty, payment methods, returns, etc.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'Topic to look up: shipping, warranty, payment, returns, products',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_info',
      description:
        'Get bank account / payment transfer information. Use when the customer needs to know where to transfer payment.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are a friendly WhatsApp sales assistant for a computer & laptop store.

CRITICAL RULES:
- You MUST use the provided tools to get product data. NEVER make up product names, prices, or stock from memory.
- Tool results are already formatted for WhatsApp. Present them to the customer as-is, you may add a brief intro line but do NOT reformat or reorder the data.
- When a customer asks to see the catalog or products, you MUST call list_catalog tool first.
- When a customer asks about a specific product, you MUST call search_products or get_product_detail first.
- When a customer asks about orders, you MUST call get_order_status first.
- When a customer asks about payment info, you MUST call get_payment_info first.
- When a customer asks FAQ-type questions, you MUST call get_faq first.
- NEVER list products without calling a tool first. If you don't have tool results, call the tool.

FORMATTING RULES:
- Respond in the same language the customer uses (Indonesian or English).
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Format prices as "Rp" with thousand separators (e.g. Rp 12.500.000).
- Use WhatsApp formatting: *bold* for emphasis, no markdown links.

BEHAVIOR:
- When greeting a customer, use their name if available from the CUSTOMER INFO section.
- When a customer greets you (e.g. "hi", "halo", "hey"), greet them by name and present a short menu of what you can help with:
  1. 🛒 Lihat katalog produk
  2. 🔍 Cari produk tertentu
  3. 📦 Cek status pesanan
  4. 💳 Info pembayaran / transfer
  5. ❓ FAQ (garansi, pengiriman, retur, dll)
- When a customer picks a menu number or says "katalog"/"lihat produk"/"semua", call list_catalog immediately.
- When a customer refers to a product by number (e.g. "no 3", "yang ke-2", "3 dan 8"), look at the [REF: ...] line in the catalog tool output to find the exact product name for each number. NEVER guess — always use the reference map.
- Be helpful and guide the customer through the buying process naturally.
- Use emoji sparingly to keep the tone warm 😊.
- If you can't find what the customer wants, suggest alternatives from the catalog.`;

@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  private readonly openai = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
  });

  constructor(
    private readonly customers: CustomersService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly catalog: CatalogService,
    private readonly faq: FaqService,
    private readonly orders: OrdersService,
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly gowa: GowaService,
    private readonly chatSession: ChatSessionService,
    private readonly settings: SettingsService,
  ) {}

  async handleInboundMessage(payload: GowaInboundMessage): Promise<void> {
    // 1. Upsert customer
    const customer = await this.customers.upsertByPhone(payload.phone, {
      ...(payload.senderName ? { name: payload.senderName } : {}),
    });

    // 2. Resolve conversation via session
    let conversation: any;
    const existingSession = await this.chatSession.getSession(payload.phone);

    if (existingSession) {
      // Active session — reuse conversation, refresh TTL
      conversation = await this.conversations.findById(
        existingSession.conversationId,
      );
      if (!conversation || conversation.status !== 'active') {
        // Session stale — create new
        conversation = await this.conversations.create(customer.id);
      }
      await this.chatSession.refreshSession(payload.phone);
    } else {
      // No session — create new conversation + session
      conversation = await this.conversations.create(customer.id);
    }

    // Always ensure session is set
    await this.chatSession.createSession(payload.phone, {
      conversationId: conversation.id,
      customerId: customer.id,
      phone: payload.phone,
      lastActivity: new Date().toISOString(),
    });

    // 3. Store inbound message
    await this.messages.storeInbound(conversation.id, payload.message, {
      gatewayMessageId: payload.messageId,
      rawPayload: payload as any,
    });
    await this.conversations.touchInbound(conversation.id);

    // 4. Build conversation history for context
    const history = await this.messages.findByConversationId(conversation.id);
    const stageHint =
      conversation.stage === 'order_confirm'
        ? '\nCONVERSATION STAGE: order_confirm — The customer has an active order. If they agree/confirm, call get_payment_info to show payment details.\n'
        : '';
    const customerContext = `\nCUSTOMER INFO:\n- Name: ${customer.name || 'Unknown'}\n- Phone: ${customer.phoneNumber}\n${stageHint}`;
    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + customerContext },
    ];

    // Include last 20 messages for context
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      chatMessages.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // 5. Short-circuit: affirmative messages during order_confirm → payment info
    const lastText = payload.message.trim().toLowerCase();
    const isAffirmative =
      /^(ok|oke|okey|okay|ya|yaa|iya|iyaa|yep|yup|yes|sure|boleh|jadi|lanjut|siap|gas|deal|ayo|yuk|mau|bisa|baik|setuju|mantap|sip|ayo|hayuk|gass|let'?s?\s*go|proceed|confirm)[\s!.]*$/i.test(
        lastText,
      );

    if (isAffirmative && conversation.stage === 'order_confirm') {
      const paymentInfo = await this.executeTool(
        'get_payment_info',
        {},
        customer,
        conversation,
      );
      const order = await this.orders.findLatestByCustomerId(customer.id);
      const reply = [
        `Baik, berikut info pembayaran untuk pesanan *${order?.orderNumber ?? ''}*:`,
        '',
        paymentInfo,
        '',
        'Setelah transfer, kirimkan bukti pembayaran di sini ya 😊',
      ].join('\n');

      await this.messages.storeOutbound(conversation.id, reply);
      await this.conversations.touchOutbound(conversation.id);
      await this.gowa.sendText(payload.phone, reply);
      return;
    }

    // 6. Run the agent loop (LLM + tool calls)
    const reply = await this.runAgentLoop(chatMessages, customer, conversation);

    // 6. Store outbound & send
    await this.messages.storeOutbound(conversation.id, reply);
    await this.conversations.touchOutbound(conversation.id);
    await this.gowa.sendText(payload.phone, reply);
  }

  private async runAgentLoop(
    messages: OpenAI.ChatCompletionMessageParam[],
    customer: any,
    conversation: any,
    maxIterations = 5,
  ): Promise<string> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText =
      typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content.trim().toLowerCase()
        : '';

    // Simple greetings never need tools
    const isGreeting =
      /^(hi|halo|hey|hello|hai|p|hei|selamat|assalam|good\s*(morning|afternoon|evening))[\s!.]*$/i.test(
        userText,
      );

    for (let i = 0; i < maxIterations; i++) {
      // Force tool call on first iteration unless it's a plain greeting.
      // This model ignores tool_choice:'auto', so we must force it.
      // On subsequent iterations (after tool results), use 'auto' to let it compose a reply.
      const shouldForceTools = i === 0 && !isGreeting;

      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages,
        tools: TOOLS,
        tool_choice: shouldForceTools ? 'required' : 'auto',
        max_tokens: appConfig.llm.maxTokens,
        temperature: appConfig.llm.temperature,
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      this.logger.debug(
        `LLM iteration ${i}: finish_reason=${choice.finish_reason}, tool_calls=${assistantMsg.tool_calls?.length ?? 0}, content=${assistantMsg.content?.substring(0, 100) ?? 'null'}`,
      );

      // If the LLM wants to call tools
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push(assistantMsg);

        for (const toolCall of assistantMsg.tool_calls) {
          const result = await this.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            customer,
            conversation,
          );

          this.logger.debug(
            `Tool: ${toolCall.function.name}(${toolCall.function.arguments}) → ${result.substring(0, 200)}`,
          );

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        continue; // Loop back to let LLM process tool results
      }

      // No tool calls — if we forced tools and model didn't comply, retry with auto
      if (shouldForceTools && i === 0) {
        this.logger.warn(
          'tool_choice=required but model returned no tool calls — retrying with auto',
        );
        // Push the (empty) assistant message so context is preserved
        if (assistantMsg.content) {
          messages.push(assistantMsg);
        }
        continue;
      }

      return (
        assistantMsg.content?.trim() ??
        'Maaf, saya tidak bisa memproses pesan Anda saat ini.'
      );
    }

    return 'Maaf, saya mengalami kesulitan memproses permintaan Anda. Bisa coba ulangi? 🙏';
  }

  private formatRupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  private async executeTool(
    name: string,
    args: Record<string, any>,
    customer: any,
    conversation: any,
  ): Promise<string> {
    try {
      switch (name) {
        case 'search_products': {
          const results = await this.catalog.search(args.query);
          if (results.length === 0) {
            return 'Tidak ditemukan produk yang cocok dengan pencarian.';
          }
          const lines = results.map(
            (p, i) =>
              `${i + 1}. *${p.name}*\n   ${p.category?.name ?? ''} — ${this.formatRupiah(p.price)}\n   Stok: ${p.stockQty > 0 ? p.stockQty : 'Habis'}`,
          );
          return `Hasil pencarian "${args.query}":\n\n${lines.join('\n\n')}`;
        }

        case 'list_catalog': {
          const products = await this.catalog.listActive(args.category);
          if (products.length === 0) {
            return 'Belum ada produk yang tersedia saat ini.';
          }
          // Flat numbered list — no category grouping to avoid LLM confusion
          const lines = products.map(
            (p, i) =>
              `${i + 1}. *${p.name}* (${p.category?.name ?? '-'})\n   ${this.formatRupiah(p.price)} — Stok: ${p.stockQty > 0 ? p.stockQty : 'Habis'}`,
          );
          // Add a reference map at the end for the LLM to use
          const refMap = products
            .map((p, i) => `${i + 1}=${p.name}`)
            .join(', ');
          return `${lines.join('\n')}\n\n[REF: ${refMap}]`;
        }

        case 'get_product_detail': {
          const results = await this.catalog.search(args.product_name);
          if (results.length === 0) {
            return 'Produk tidak ditemukan.';
          }
          const p = results[0];
          return [
            `*${p.name}*`,
            `Kategori: ${p.category?.name ?? '-'}`,
            `Harga: ${this.formatRupiah(p.price)}`,
            `Stok: ${p.stockQty > 0 ? `${p.stockQty} unit` : 'Habis'}`,
            p.description ? `\n${p.description}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        }

        case 'create_order': {
          // Support both old single-item format and new multi-item format
          const rawItems: { product_name: string; quantity?: number }[] =
            args.items ?? [
              { product_name: args.product_name, quantity: args.quantity },
            ];

          const orderItems: { productId: string; quantity: number }[] = [];
          const itemLines: string[] = [];

          for (const item of rawItems) {
            const matches = await this.catalog.search(item.product_name);
            if (matches.length === 0) {
              return `Produk "${item.product_name}" tidak ditemukan. Coba cari dengan kata kunci lain.`;
            }
            const product = matches[0];
            const qty = item.quantity ?? 1;

            if (product.stockQty < qty) {
              return `Stok *${product.name}* tidak cukup. Tersedia: ${product.stockQty} unit.`;
            }

            orderItems.push({ productId: product.id, quantity: qty });
            itemLines.push(
              `- ${product.name} x${qty} @ ${this.formatRupiah(product.price)} = ${this.formatRupiah(product.price * qty)}`,
            );
          }

          const order = await this.orders.create({
            customerId: customer.id,
            conversationId: conversation.id,
            items: orderItems,
          });

          await this.conversations.update(conversation.id, {
            stage: 'order_confirm',
          });

          return [
            '✅ *Pesanan berhasil dibuat!*',
            `No. Pesanan: *${order.orderNumber}*`,
            '',
            ...itemLines,
            '',
            `*Total: ${this.formatRupiah(Number(order.totalAmount))}*`,
          ].join('\n');
        }

        case 'get_order_status': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return 'Belum ada pesanan yang tercatat.';
          }
          return [
            `📦 *Status Pesanan*`,
            `No. Pesanan: *${order.orderNumber}*`,
            `Status: ${order.status}`,
            `Total: ${this.formatRupiah(Number(order.totalAmount))}`,
          ].join('\n');
        }

        case 'generate_invoice': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return 'Belum ada pesanan untuk dibuatkan invoice.';
          }
          const invoice = await this.invoices.generateForOrder(
            order.id,
            customer.id,
          );
          return [
            '🧾 *Invoice*',
            `No. Invoice: *${invoice.invoiceNumber}*`,
            `Total: ${this.formatRupiah(Number(invoice.totalAmount))}`,
          ].join('\n');
        }

        case 'confirm_payment': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return 'Tidak ada pesanan aktif untuk konfirmasi pembayaran.';
          }
          await this.payments.create({
            orderId: order.id,
            customerId: customer.id,
            amount: Number(order.totalAmount),
            referenceNumber: args.reference ?? '',
          });
          return `✅ Pembayaran untuk pesanan *${order.orderNumber}* berhasil dikonfirmasi. Terima kasih!`;
        }

        case 'get_faq': {
          const entries = await this.faq.listActive();
          const filtered = args.topic
            ? entries.filter(
                (f) =>
                  f.category
                    ?.toLowerCase()
                    .includes(args.topic.toLowerCase()) ||
                  f.question.toLowerCase().includes(args.topic.toLowerCase()),
              )
            : entries;
          if (filtered.length === 0) {
            return 'Tidak ada FAQ yang cocok dengan topik tersebut.';
          }
          const faqLines = filtered.map(
            (f, i) => `${i + 1}. *${f.question}*\n   ${f.answer}`,
          );
          return `❓ *FAQ*\n\n${faqLines.join('\n\n')}`;
        }

        case 'get_payment_info': {
          const instructions = await this.settings.getPaymentInstructions();
          return instructions || 'Informasi pembayaran belum tersedia.';
        }

        default:
          return `Tool "${name}" tidak dikenali.`;
      }
    } catch (err: any) {
      this.logger.error(`Tool ${name} failed: ${err.message}`);
      return JSON.stringify({ error: err.message });
    }
  }
}
