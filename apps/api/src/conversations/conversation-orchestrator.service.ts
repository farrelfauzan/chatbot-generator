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
              'Box type: "indomi" or "die_cut". Leave empty for all.',
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
        'Send catalog images (photos of available cardboard boxes) to the customer via WhatsApp. Use when: (1) customer first asks about cardboard/dus/kardus without specifying a size or use case, (2) customer asks to see the catalog visually, or (3) customer says "lihat katalog", "foto", "gambar".',
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
- When a tool returns formatted text, you MUST copy-paste the ENTIRE tool output into your reply verbatim. Add only a brief 1-line intro before it. Do NOT summarize, shorten, reformat, or TRANSLATE any items from the tool output.
- ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER switch to English.
- When customer asks for catalog or available boxes, call list_catalog or send_catalog_images.
- When customer FIRST asks about cardboard/dus/kardus (e.g. "ada dus?", "jual kardus?", "mau beli dus", "cari dus") and has NOT described a specific use case or size, ALWAYS call send_catalog_images FIRST so they can see what we offer. Then follow up with text.
- When customer describes what they need (use case), call recommend_box.
- When customer asks urgently, call check_ready_stock.
- NEVER list products without calling a tool first.
- When customer wants to order/buy, you MUST call create_order. NEVER say "sedang diproses" without calling the tool.
- When customer asks about payment or wants to pay, you MUST call get_payment_info. NEVER make up bank account numbers.
- NEVER fabricate payment information, bank accounts, or prices. ALWAYS call the appropriate tool.
- When customer replies with just a number (e.g. "10", "50"), use the conversation context to understand what they mean. If you just asked "berapa jumlah?", the number is the quantity — call create_order.

CONSULTATION MODE — IMPORTANT:
- When a customer describes what they need to pack, IMMEDIATELY call recommend_box. Do NOT ask for dimensions first.
- NEVER ask the customer for box measurements. You are the expert — estimate the best size yourself based on the item description.
- For heavy items (>10kg), set is_heavy=true to get doublewall recommendations.
- If the customer says something vague like "bungkus bola golf" or "kardus untuk baju", just call recommend_box immediately with the use case. The tool will find suitable options.
- Custom sizes are NOT available — always recommend the closest match from our catalog.
- You should NEVER respond with just text when the customer describes a packing need. ALWAYS call recommend_box.

FORMATTING RULES:
- ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER use English.
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Format prices as "Rp" with thousand separators (e.g. Rp 1.200).
- Use WhatsApp formatting: *bold* for emphasis.
- When copying tool output, do NOT translate labels like "Opsi A" to "Option A". Keep all tool output exactly as-is.

FOLLOW-UP BEHAVIOR:
- After every recommendation, ALWAYS follow up with options.
- Guide the customer through the buying process naturally.
- You may briefly mention "Tersedia juga jasa sablon mulai Rp 500/sisi" once, but do NOT ask if they want sablon. Just inform, don't question.

GREETING:
- ONLY greet when the customer sends an initial greeting (e.g. "halo", "hi", "hey"). Say: "Halo, kak {{customerName}} 👋 lagi cari dus ukuran apa kahh? Lokasi kita di Kapuk, Jakarta Barat ya 📍" — then ALSO call send_catalog_images so the customer can see our products right away.
- Do NOT greet again if the conversation already has messages. NEVER repeat the greeting.
- Do NOT show a numbered menu. Let the conversation flow naturally.

URGENT MODE:
- If customer mentions urgency ("cepat", "urgent", "hari ini", "buru-buru"), call check_ready_stock.
- Say: "Untuk kebutuhan cepat, kami sarankan pilih ready stock."

SABLON INFO:
- Sablon = printing on the box surface. Price: Rp 500 per side. Can do 1-4 sides.
- You may mention sablon availability once as a brief info, e.g. "Tersedia juga jasa sablon mulai Rp 500/sisi ya kak".
- Do NOT ask "mau sablon?" or "apakah mau pakai sablon?" — just inform, don't question.

ORDER FLOW:
- When customer picks a product option (e.g. "opsi B", "yang sedang"), ALWAYS ask how many they want FIRST. Say something like "Baik kak, Opsi B ya. Mau pesan berapa pcs kak?"
- NEVER assume quantity from stock numbers. The stock is how many we have, NOT how many the customer wants.
- Only call create_order AFTER the customer explicitly states a quantity (e.g. "100 dus", "50 pcs", "10 buah", or just a number like "10").
- ABSOLUTELY NEVER generate an order summary yourself. ONLY the create_order tool can create orders.
- If you reply with order details without calling create_order, the order will NOT be saved and payment will FAIL.
- After create_order succeeds, the tool returns the full order summary with items and total.
- Copy-paste the ENTIRE order summary from the tool. Do NOT add extra questions.
- Ask "Lanjut ke pembayaran?" — nothing else.

PAYMENT INFO:
- We accept DOKU online payment (VA, QRIS, e-wallet, credit card).
- DOKU payment link will be generated automatically after order is created.
- When customer asks about payment or wants to pay, call get_payment_info tool. NEVER say we don't accept DOKU.
- When customer confirms/agrees after you asked "Lanjut ke pembayaran?", you MUST call get_payment_info immediately. Do NOT reply with just text.
- ANY affirmative response after an order (e.g. "ya", "ok", "boleh", "lanjut", "siap", "gas", "ya boleh lanjut") means they want to pay → call get_payment_info.
- Payment methods: Virtual Account, QRIS, e-wallet (OVO, ShopeePay, DANA, LinkAja), kartu kredit.`;

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

  /**
   * This is the main entry point for handling an inbound WhatsApp message from Gowa. It will:
   * 1. Upsert the customer based on phone number
   * 2. Resolve the conversation via chat session (create new if no active session)
   * 3. Store the inbound message
   * 4. Build the conversation history and system prompt for LLM context
   * 5. Run the agent loop (LLM + tool calls) to get a reply
   * @param payload
   * @returns
   *
   */
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
    let stageHint = '';
    if (conversation.stage === 'order_confirm') {
      stageHint = [
        '\n⚠️ CONVERSATION STAGE: order_confirm',
        'The customer has a pending order waiting for payment.',
        'If the customer agrees, confirms, or says anything affirmative (e.g. "ya", "boleh", "lanjut", "ok", etc.), you MUST call get_payment_info immediately.',
        'If the customer wants to cancel or change the order, respond naturally.',
        'Do NOT respond with just text — call get_payment_info for any confirmation.\n',
      ].join('\n');
    }
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

    // 5. Run the agent loop (LLM + tool calls)
    let reply = await this.runAgentLoop(chatMessages, customer, conversation);

    // Sanitize: replace literal \n with actual newlines (LLM sometimes escapes them)
    reply = reply.replace(/\\n/g, '\n');

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
    let lastToolResult: string | null = null;

    let nullCount = 0;

    for (let i = 0; i < maxIterations; i++) {
      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages,
        tools: TOOLS,
        tool_choice: nullCount >= 2 ? 'required' : 'auto',
        max_tokens: appConfig.llm.maxTokens,
        temperature: Math.min(appConfig.llm.temperature + nullCount * 0.2, 1.5),
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

      // No tool calls — LLM responded with text (or null)
      const contentText = assistantMsg.content?.trim() ?? '';

      // If we just ran tools, the LLM should be presenting tool results.
      // If it returned null/empty OR ignored the tool output (e.g. repeated greeting),
      // use the tool result directly to avoid losing data.
      if (lastToolResult) {
        // Check if LLM actually incorporated the tool data or just babbled
        const toolDataSnippet = lastToolResult.substring(0, 40);
        if (
          !contentText ||
          !contentText.includes(toolDataSnippet.substring(0, 20))
        ) {
          this.logger.warn(
            `LLM ignored tool result, using lastToolResult directly. LLM said: "${contentText.substring(0, 80)}"`,
          );
          return lastToolResult;
        }
      }

      // Check if model returned tool-call-like text instead
      const toolCallTextMatch =
        contentText.match(
          /(?:call|invoke|execute)[:\s]+(?:default_api\.)?([a-z_]+)\s*\(/i,
        ) ||
        contentText.match(
          /(?:print|default_api)\s*[\.(]\s*(?:default_api\.)?([a-z_]+)\s*\(/i,
        ) ||
        contentText.match(
          /^tool_code[\s\S]*?(?:default_api\.)?([a-z_]+)\s*\(/im,
        );

      if (toolCallTextMatch) {
        // Model wrote a tool call as text — parse args and execute manually
        const toolName = toolCallTextMatch[1];
        let parsedArgs: Record<string, any> = {};

        // Try to extract arguments from the text
        try {
          // Match key=value or key='value' patterns
          const argsStr = contentText;
          const itemsMatch = argsStr.match(/items\s*=\s*\[([^\]]+)\]/);
          if (itemsMatch && toolName === 'create_order') {
            const items: { box_name: string; quantity: number }[] = [];
            const itemPattern =
              /box_name\s*=\s*'([^']+)'[^)]*quantity\s*=\s*(\d+)/g;
            let m: RegExpExecArray | null;
            while ((m = itemPattern.exec(itemsMatch[1])) !== null) {
              items.push({ box_name: m[1], quantity: Number(m[2]) });
            }
            if (items.length > 0) parsedArgs = { items };
          }
          const queryMatch = argsStr.match(/query\s*=\s*'([^']+)'/);
          if (queryMatch) parsedArgs = { query: queryMatch[1] };
          const useCaseMatch = argsStr.match(/use_case\s*=\s*'([^']+)'/);
          if (useCaseMatch) parsedArgs = { use_case: useCaseMatch[1] };
        } catch {
          // Fall back to empty args
        }

        this.logger.warn(
          `Model returned tool call as text: "${contentText.substring(0, 100)}" — executing ${toolName}(${JSON.stringify(parsedArgs)}) manually`,
        );
        const result = await this.executeTool(
          toolName,
          parsedArgs,
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

      const finalReply = contentText || lastToolResult || '';

      // If LLM returned nothing (null content, no tool calls), retry the same call
      // with higher temperature instead of polluting context with nudge messages
      if (!finalReply && i < maxIterations - 1) {
        nullCount++;
        this.logger.warn(
          `LLM returned empty on iteration ${i}, retrying with higher temperature (${Math.min(appConfig.llm.temperature + nullCount * 0.2, 1.5)})`,
        );
        continue;
      }

      return (
        finalReply ||
        'Maaf, saya tidak bisa memproses pesan Anda saat ini. Bisa coba ulangi? 🙏'
      );
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
    // Strip "default_api." prefix that some LLMs add
    const toolName = name.replace(/^default_api\./, '');
    try {
      switch (toolName) {
        case 'search_boxes': {
          const query = args.query;
          const results = await this.cardboard.search(query);
          if (results.length === 0) {
            return `Maaf kak, ukuran ${query} tidak tersedia. Boleh coba ukuran lain atau ceritakan kebutuhannya, nanti kami bantu carikan yang paling cocok 😊`;
          }

          // Check if exact dimension match or closest alternatives
          const dimMatch = query.match(
            /([\d]+(?:[.,][\d]+)?)\s*x\s*([\d]+(?:[.,][\d]+)?)\s*x\s*([\d]+(?:[.,][\d]+)?)/i,
          );
          let isExact = false;
          if (dimMatch) {
            const p = parseFloat(dimMatch[1].replace(',', '.'));
            const l = parseFloat(dimMatch[2].replace(',', '.'));
            const t = parseFloat(dimMatch[3].replace(',', '.'));
            isExact = results.some(
              (r) => r.panjang === p && r.lebar === l && r.tinggi === t,
            );
          }

          const lines = results
            .slice(0, 10)
            .map(
              (p, i) =>
                `${i + 1}. *${p.name}*\n   Ukuran: ${p.panjang}x${p.lebar}x${p.tinggi} cm\n   Harga: ${this.formatRupiah(Number(p.pricePerPcs))}/pcs\n   Stok: ${p.stockQty > 0 ? `${p.stockQty} pcs` : 'Habis'}${p.isReadyStock ? ' ✅ Ready Stock' : ''}`,
            );

          if (isExact) {
            return `✅ Ukuran *${query}* tersedia kak!\n\n${lines.join('\n\n')}\n\nMau pesan berapa pcs kak? 😊`;
          } else {
            return `Maaf kak, ukuran *${query}* tidak tersedia. Tapi ada ukuran terdekat:\n\n${lines.join('\n\n')}\n\nAda yang cocok, atau mau coba ukuran lain? 😊`;
          }
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
            const label =
              type === 'die_cut' ? '✂️ Dus Die Cut' : '📦 Dus Indomi';
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

          // If there's an active order and DOKU is configured, generate payment link
          if (latestOrder && this.doku.isConfigured) {
            try {
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
                  '_Link berlaku 1 jam._',
                ].join('\n');
              }
            } catch (err: any) {
              this.logger.error(`DOKU createInvoice error: ${err.message}`);
              return [
                '💳 *Pembayaran*',
                '',
                `No. Pesanan: *${latestOrder.orderNumber}*`,
                `Total: *${this.formatRupiah(Number(latestOrder.totalAmount))}*`,
                '',
                'Maaf kak, sistem pembayaran sedang gangguan. Mohon coba lagi beberapa saat ya 🙏',
              ].join('\n');
            }
          }

          // No active order but DOKU is configured — inform payment methods
          if (this.doku.isConfigured) {
            return [
              '💳 *Metode Pembayaran (DOKU)*',
              '',
              'Kami menerima pembayaran via:',
              '• Virtual Account (BCA, Mandiri, BRI, BNI, dll)',
              '• QRIS',
              '• E-wallet (OVO, ShopeePay, DANA, LinkAja)',
              '• Kartu Kredit',
              '',
              'Link pembayaran otomatis dikirim setelah pesanan dibuat ya kak 😊',
            ].join('\n');
          }

          return 'Informasi pembayaran belum tersedia.';
        }

        default:
          return `Tool "${toolName}" tidak dikenali.`;
      }
    } catch (err: any) {
      this.logger.error(`Tool ${toolName} failed: ${err.message}`);
      return 'Maaf, terjadi kesalahan saat memproses. Silakan coba lagi.';
    }
  }
}
