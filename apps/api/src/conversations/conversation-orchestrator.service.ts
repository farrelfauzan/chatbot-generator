import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CardboardService } from '../cardboard/cardboard.service';
import { CatalogImagesService } from '../catalog-images/catalog-images.service';
import { FaqService } from '../faq/faq.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { GowaService } from '../gowa/gowa.service';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { SettingsService } from '../settings/settings.service';
import { DokuService } from '../doku/doku.service';
import { appConfig } from '../app.config';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

// ─── Tool definitions for function calling ────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_boxes',
      description:
        'Search cardboard boxes by keyword, dimensions, material, or use case. Use when customer mentions a specific size or type.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search keyword: size (e.g. "30x20x15"), type (e.g. "pizza"), or material (e.g. "doublewall")',
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
        'List available cardboard boxes. Can filter by type and material. Use when customer wants to see all available sizes.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description:
              'Box type: "dus_baru" or "dus_pizza". Leave empty for all.',
          },
          material: {
            type: 'string',
            description:
              'Material filter: "singlewall", "cflute", or "doublewall". Leave empty for all.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_box',
      description:
        'Recommend the best box for a specific use case. ALWAYS call this immediately when customer describes what they need to pack. Do NOT ask clarifying questions first — just call this tool with the use case description.',
      parameters: {
        type: 'object',
        properties: {
          use_case: {
            type: 'string',
            description:
              'Full description of what the customer needs: item type, quantity, weight, etc. Example: "300 bola golf langsung tanpa kemasan", "10 kg ikan frozen"',
          },
          is_heavy: {
            type: 'boolean',
            description:
              'Whether the total weight is heavy (>10kg). If true, recommend doublewall material.',
          },
        },
        required: ['use_case'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_catalog_images',
      description:
        'Send catalog images (photos of available cardboard boxes) to the customer via WhatsApp. Use when customer asks to see the catalog visually or says "lihat katalog", "foto", "gambar".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_ready_stock',
      description:
        'Check which boxes are in ready stock for immediate delivery. Use when customer needs boxes urgently ("cepat", "urgent", "hari ini", "segera", "buru-buru").',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description:
        'Create a purchase order for cardboard boxes. Use when customer confirms they want to order.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of boxes to order',
            items: {
              type: 'object',
              properties: {
                box_name: {
                  type: 'string',
                  description:
                    'Name or size of the box (e.g. "Dus 30x20x15 Singlewall")',
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity to order',
                },
              },
              required: ['box_name', 'quantity'],
            },
          },
          sablon_sides: {
            type: 'number',
            description:
              'Number of sides for sablon/printing (0-4). 0 = no sablon.',
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
      description: 'Get the latest order status for the current customer.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_faq',
      description:
        'Get FAQ answers about shipping, payment, sablon, materials, location, returns, etc.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'Topic to look up: shipping, payment, products, location, order, sablon',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_info',
      description: 'Get bank account / payment transfer information.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are a friendly WhatsApp sales assistant for a cardboard box (dus/kardus) supplier located in Kapuk, Jakarta Barat.

CRITICAL RULES:
- You MUST use the provided tools to get product data. NEVER make up sizes, prices, or stock from memory.
- When a tool returns formatted text, you MUST copy-paste the ENTIRE tool output into your reply verbatim. Add only a brief 1-line intro before it. Do NOT summarize, shorten, or omit any items from the tool output.
- When customer asks for catalog or available boxes, call list_catalog or send_catalog_images.
- When customer describes what they need (use case), call recommend_box.
- When customer asks urgently, call check_ready_stock.
- NEVER list products without calling a tool first.
- When customer wants to order/buy, you MUST call create_order. NEVER say "sedang diproses" without calling the tool.
- When customer asks about payment or wants to pay, you MUST call get_payment_info. NEVER make up bank account numbers.
- NEVER fabricate payment information, bank accounts, or prices. ALWAYS call the appropriate tool.

CONSULTATION MODE — IMPORTANT:
- When a customer describes what they need to pack, IMMEDIATELY call recommend_box. Do NOT ask for dimensions first.
- NEVER ask the customer for box measurements. You are the expert — estimate the best size yourself based on the item description.
- For heavy items (>10kg), set is_heavy=true to get doublewall recommendations.
- If the customer says something vague like "bungkus bola golf" or "kardus untuk baju", just call recommend_box immediately with the use case. The tool will find suitable options.
- Custom sizes are NOT available — always recommend the closest match from our catalog.
- You should NEVER respond with just text when the customer describes a packing need. ALWAYS call recommend_box.

FORMATTING RULES:
- Respond in Indonesian (Bahasa Indonesia).
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Format prices as "Rp" with thousand separators (e.g. Rp 1.200).
- Use WhatsApp formatting: *bold* for emphasis.

FOLLOW-UP BEHAVIOR:
- After every recommendation, ALWAYS follow up with options.
- Guide the customer through the buying process naturally.
- Mention sablon option (Rp 500/sisi) if the customer hasn't asked about it.

GREETING:
- When greeting a customer, say: "Halo, kak {{customerName}} 👋 lagi cari dus ukuran apa kahh? Lokasi kita di Kapuk, Jakarta Barat ya 📍"
- Do NOT show a numbered menu. Let the conversation flow naturally.

URGENT MODE:
- If customer mentions urgency ("cepat", "urgent", "hari ini", "buru-buru"), call check_ready_stock.
- Say: "Untuk kebutuhan cepat, kami sarankan pilih ready stock."

SABLON INFO:
- Sablon = printing on the box surface. Price: Rp 500 per side. Can do 1-4 sides.

PAYMENT INFO:
- We accept DOKU online payment (VA, QRIS, e-wallet, credit card) AND bank transfer.
- DOKU payment link will be generated automatically after order is created.
- When customer asks about payment, call get_payment_info tool. NEVER say we don't accept DOKU.
- ALWAYS mention both options: online payment via DOKU and manual bank transfer.`;

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
    private readonly cardboard: CardboardService,
    private readonly catalogImages: CatalogImagesService,
    private readonly faq: FaqService,
    private readonly orders: OrdersService,
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly gowa: GowaService,
    private readonly chatSession: ChatSessionService,
    private readonly settings: SettingsService,
    private readonly doku: DokuService,
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
      {
        role: 'system',
        content:
          SYSTEM_PROMPT.replace('{{customerName}}', customer.name || 'kakak') +
          customerContext,
      },
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
      const order = await this.orders.findLatestByCustomerId(customer.id);
      if (!order) {
        const reply =
          'Belum ada pesanan aktif. Silakan pilih produk terlebih dahulu ya kak.';
        await this.messages.storeOutbound(conversation.id, reply);
        await this.conversations.touchOutbound(conversation.id);
        await this.gowa.sendText(payload.phone, reply);
        return;
      }

      // Try DOKU payment link first, fallback to bank transfer
      let paymentSection: string;
      if (this.doku.isConfigured) {
        const dokuResult = await this.doku.createInvoice({
          orderId: order.orderNumber,
          amount: Number(order.totalAmount),
          customerName: customer.name || 'Customer',
          customerPhone: customer.phoneNumber,
          description: `Pembayaran pesanan ${order.orderNumber}`,
        });
        if (dokuResult) {
          paymentSection = [
            '💳 *Pembayaran Online*',
            `Klik link berikut untuk bayar:`,
            dokuResult.invoiceUrl,
            '',
            '_Link berlaku 24 jam_',
          ].join('\n');
        } else {
          const bankInfo = await this.settings.getPaymentInstructions();
          paymentSection = bankInfo || 'Informasi pembayaran belum tersedia.';
        }
      } else {
        const bankInfo = await this.settings.getPaymentInstructions();
        paymentSection = bankInfo || 'Informasi pembayaran belum tersedia.';
      }

      const reply = [
        `Baik kak, berikut info pembayaran untuk pesanan *${order.orderNumber}*:`,
        `Total: *${this.formatRupiah(Number(order.totalAmount))}*`,
        '',
        paymentSection,
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

    // Guard: never send empty message
    if (!reply || !reply.trim()) {
      this.logger.warn('Agent loop returned empty reply, sending fallback');
      const fallback =
        'Maaf, saya tidak bisa memproses pesan Anda saat ini. Bisa coba ulangi? 🙏';
      await this.messages.storeOutbound(conversation.id, fallback);
      await this.conversations.touchOutbound(conversation.id);
      await this.gowa.sendText(payload.phone, fallback);
      return;
    }

    // 7. Store outbound & send
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
    // Detect simple greetings that don't need tools
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText =
      typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content.trim().toLowerCase()
        : '';
    const isGreeting =
      /^(hi|halo|hey|hello|hai|p|hei|selamat|assalam|good\s*(morning|afternoon|evening))[\s!.]*$/i.test(
        userText,
      );

    let lastToolResult: string | null = null;

    for (let i = 0; i < maxIterations; i++) {
      // Force tool call on first iteration for non-greetings.
      // This model ignores tool_choice:'auto' and never calls tools otherwise.
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

          lastToolResult = result;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        continue; // Loop back to let LLM process tool results
      }

      // No tool calls — check if model returned tool-call-like text instead
      const contentText = assistantMsg.content?.trim() ?? '';
      const toolCallTextMatch = contentText.match(
        /(?:call|invoke|execute)[:\s]+(?:default_api\.)?([a-z_]+)\s*\(/i,
      );

      if (toolCallTextMatch) {
        // Model wrote a tool call as text — execute it manually
        const toolName = toolCallTextMatch[1];
        this.logger.warn(
          `Model returned tool call as text: "${contentText}" — executing ${toolName} manually`,
        );
        const result = await this.executeTool(
          toolName,
          {},
          customer,
          conversation,
        );
        lastToolResult = result;
        messages.push({
          role: 'assistant',
          content: result,
        });
        continue;
      }

      if (shouldForceTools && i === 0) {
        this.logger.warn(
          'tool_choice=required but model returned no tool calls — retrying with auto',
        );
        if (contentText) {
          messages.push(assistantMsg);
        }
        continue;
      }

      const finalReply =
        contentText ||
        lastToolResult ||
        'Maaf, saya tidak bisa memproses pesan Anda saat ini.';
      return finalReply;
    }

    return 'Maaf kak, saya mengalami kesulitan memproses permintaan. Bisa coba ulangi? 🙏';
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
        case 'search_boxes': {
          const results = await this.cardboard.search(args.query);
          if (results.length === 0) {
            return 'Tidak ditemukan dus yang cocok dengan pencarian.';
          }
          const lines = results
            .slice(0, 10)
            .map(
              (p, i) =>
                `${i + 1}. *${p.name}*\n   ${this.formatRupiah(Number(p.pricePerPcs))}/pcs — Stok: ${p.stockQty > 0 ? p.stockQty : 'Habis'}${p.isReadyStock ? ' ✅ Ready' : ''}`,
            );
          return `Hasil pencarian "${args.query}":\n\n${lines.join('\n\n')}`;
        }

        case 'list_catalog': {
          const products = await this.cardboard.findAll({
            type: args.type,
            material: args.material,
          });
          if (products.length === 0) {
            return 'Belum ada produk yang tersedia saat ini.';
          }

          // Group by type for cleaner output, limit to 15 per group
          const grouped = new Map<string, typeof products>();
          for (const p of products) {
            const key = p.type;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(p);
          }

          const sections: string[] = [];
          let idx = 0;
          const refParts: string[] = [];
          for (const [type, items] of grouped) {
            const label = type === 'dus_pizza' ? '🍕 Dus Pizza' : '📦 Dus Baru';
            const limited = items.slice(0, 15);
            const lines = limited.map((p) => {
              idx++;
              refParts.push(`${idx}=${p.name}`);
              return `${idx}. *${p.name}*\n   ${this.formatRupiah(Number(p.pricePerPcs))}/pcs — Stok: ${p.stockQty > 0 ? p.stockQty : 'Habis'}${p.isReadyStock ? ' ✅' : ''}`;
            });
            const moreText =
              items.length > 15
                ? `\n   _...dan ${items.length - 15} ukuran lainnya_`
                : '';
            sections.push(`${label}\n${lines.join('\n')}${moreText}`);
          }

          return `📦 *Katalog Dus*\n\n${sections.join('\n\n')}\n\n[REF: ${refParts.join(', ')}]\n\n💡 Sablon tersedia: +Rp 500/sisi`;
        }

        case 'recommend_box': {
          const material = args.is_heavy ? 'doublewall' : undefined;

          // Get a variety of sizes — small, medium, large
          const allProducts = await this.cardboard.findAll({
            material,
          });

          if (allProducts.length === 0) {
            return 'Maaf, tidak ada dus yang sesuai saat ini.';
          }

          // Sort by surface area and pick small, medium, large options
          const sorted = allProducts
            .filter((p) => p.stockQty > 0)
            .sort((a, b) => Number(a.surfaceArea) - Number(b.surfaceArea));

          if (sorted.length === 0) {
            return 'Maaf, semua stok sedang habis saat ini.';
          }

          // Pick 3 spread options: small-ish, medium, large
          const pickIdx = [
            Math.floor(sorted.length * 0.2),
            Math.floor(sorted.length * 0.5),
            Math.floor(sorted.length * 0.8),
          ];
          const picks = [...new Set(pickIdx)].map(
            (i) => sorted[Math.min(i, sorted.length - 1)],
          );

          const lines = picks.map((box, i) => {
            const label =
              i === 0
                ? 'Opsi A (Kecil)'
                : i === 1
                  ? 'Opsi B (Sedang)'
                  : 'Opsi C (Besar)';
            return [
              `📦 *${label}*: ${box.name}`,
              `   Ukuran: ${box.panjang}x${box.lebar}x${box.tinggi} cm`,
              `   Material: ${box.material}`,
              `   Harga: ${this.formatRupiah(Number(box.pricePerPcs))}/pcs`,
              `   Stok: ${box.stockQty > 0 ? `${box.stockQty} pcs` : 'Habis'}${box.isReadyStock ? ' ✅ Ready Stock' : ''}`,
              box.leadTimeDays ? `   Lead time: ~${box.leadTimeDays} hari` : '',
            ]
              .filter(Boolean)
              .join('\n');
          });

          return `Untuk kebutuhan: *${args.use_case}*\n\n${lines.join('\n\n')}\n\nSilakan pilih yang paling sesuai atau jika ingin alternatif lain bisa diinformasikan 😊`;
        }

        case 'send_catalog_images': {
          const images = await this.catalogImages.findAll();
          if (images.length === 0) {
            return 'Foto katalog belum tersedia. Silakan tanyakan ukuran yang dibutuhkan.';
          }

          const maxImages = images.slice(0, 3);
          for (const img of maxImages) {
            await this.gowa.sendImage(
              customer.phoneNumber,
              img.imageUrl,
              img.title + (img.description ? `\n${img.description}` : ''),
            );
          }

          const extra =
            images.length > 3
              ? `\n\nMasih ada ${images.length - 3} foto lainnya, mau lihat lagi?`
              : '';
          return `Kami sudah kirimkan ${maxImages.length} foto katalog ya kak. Ada ukuran yang cocok, atau mau konsultasi dulu? 😊${extra}`;
        }

        case 'check_ready_stock': {
          const readyStock = await this.cardboard.findReadyStock();
          if (readyStock.length === 0) {
            return 'Maaf, saat ini tidak ada stok ready. Untuk custom membutuhkan waktu 3-7 hari kerja.';
          }

          const lines = readyStock
            .slice(0, 10)
            .map(
              (p, i) =>
                `${i + 1}. *${p.name}*\n   ${this.formatRupiah(Number(p.pricePerPcs))}/pcs — Stok: ${p.stockQty}`,
            );

          return `⚡ *Ready Stock (Bisa Langsung Kirim)*\n\n${lines.join('\n\n')}\n\nUntuk custom ukuran membutuhkan waktu sekitar 3-7 hari. Tapi akan kita usahakan secepatnya! 💪`;
        }

        case 'create_order': {
          const rawItems: { box_name: string; quantity: number }[] =
            args.items ?? [];
          const sablonSides = args.sablon_sides ?? 0;
          const orderItems: { cardboardProductId: string; quantity: number }[] =
            [];
          const itemLines: string[] = [];

          for (const item of rawItems) {
            const matches = await this.cardboard.search(item.box_name);
            if (matches.length === 0) {
              return `Dus "${item.box_name}" tidak ditemukan. Coba sebutkan ukuran yang lebih spesifik.`;
            }

            const product = matches[0];
            const qty = item.quantity ?? 1;

            if (product.stockQty < qty) {
              return `Stok *${product.name}* tidak cukup. Tersedia: ${product.stockQty} pcs.`;
            }

            const sablonCost = sablonSides * 500 * qty;
            const lineTotal = Number(product.pricePerPcs) * qty + sablonCost;

            orderItems.push({
              cardboardProductId: product.id,
              quantity: qty,
            });

            let line = `- ${product.name} x${qty} @ ${this.formatRupiah(Number(product.pricePerPcs))} = ${this.formatRupiah(Number(product.pricePerPcs) * qty)}`;
            if (sablonSides > 0) {
              line += `\n  + Sablon ${sablonSides} sisi = ${this.formatRupiah(sablonCost)}`;
            }
            itemLines.push(line);
          }

          const order = await this.orders.create({
            customerId: customer.id,
            conversationId: conversation.id,
            items: orderItems.map((i) => ({
              productId: i.cardboardProductId,
              quantity: i.quantity,
            })),
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
            '',
            'Lanjut ke pembayaran? 😊',
          ].join('\n');
        }

        case 'get_order_status': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return 'Belum ada pesanan yang tercatat.';
          }
          return [
            '📦 *Status Pesanan*',
            `No. Pesanan: *${order.orderNumber}*`,
            `Status: ${order.status}`,
            `Total: ${this.formatRupiah(Number(order.totalAmount))}`,
            '',
            'Pesanan sedang kami proses ya kak 🙏',
          ].join('\n');
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
            return 'Tidak ada FAQ yang cocok. Coba tanyakan langsung ya kak.';
          }
          const faqLines = filtered.map(
            (f, i) => `${i + 1}. *${f.question}*\n   ${f.answer}`,
          );
          return `❓ *FAQ*\n\n${faqLines.join('\n\n')}`;
        }

        case 'get_payment_info': {
          const latestOrder = await this.orders.findLatestByCustomerId(
            customer.id,
          );
          const bankInfo = await this.settings.getPaymentInstructions();

          // If there's an active order and DOKU is configured, generate payment link
          if (latestOrder && this.doku.isConfigured) {
            const dokuResult = await this.doku.createInvoice({
              orderId: latestOrder.orderNumber,
              amount: Number(latestOrder.totalAmount),
              customerName: customer.name || 'Customer',
              customerPhone: customer.phoneNumber,
              description: `Pembayaran pesanan ${latestOrder.orderNumber}`,
            });
            if (dokuResult) {
              return [
                '💳 *Pembayaran Online (DOKU)*',
                `Total: *${this.formatRupiah(Number(latestOrder.totalAmount))}*`,
                '',
                'Klik link berikut untuk bayar:',
                dokuResult.invoiceUrl,
                '',
                '_Bisa bayar via VA, QRIS, e-wallet, atau kartu kredit._',
                '_Link berlaku 24 jam._',
                '',
                'Atau transfer manual:',
                bankInfo ?? '',
              ]
                .filter(Boolean)
                .join('\n');
            }
          }

          // No active order but DOKU is configured — inform payment methods
          if (this.doku.isConfigured) {
            return [
              '💳 *Metode Pembayaran*',
              '',
              '1️⃣ *Pembayaran Online (DOKU)* — VA, QRIS, e-wallet, kartu kredit',
              '   Link pembayaran otomatis dikirim setelah pesanan dibuat.',
              '',
              '2️⃣ *Transfer Bank Manual*',
              bankInfo ?? '',
              '',
              'Silakan buat pesanan dulu, nanti link pembayaran DOKU akan langsung dikirim ya kak 😊',
            ]
              .filter(Boolean)
              .join('\n');
          }

          // DOKU not configured — bank transfer only
          return bankInfo || 'Informasi pembayaran belum tersedia.';
        }

        default:
          return `Tool "${name}" tidak dikenali.`;
      }
    } catch (err: any) {
      this.logger.error(`Tool ${name} failed: ${err.message}`);
      return 'Maaf, terjadi kesalahan saat memproses. Silakan coba lagi.';
    }
  }
}
