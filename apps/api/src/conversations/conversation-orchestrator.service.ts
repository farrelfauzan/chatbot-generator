import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
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
import {
  calculatePrice,
  calculateTotal,
  calculateSurfaceArea,
  calculatePizzaSheet,
  MATERIALS_DUS_BARU,
  type BoxType,
  type Material,
} from '../cardboard/pricing';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

// ─── Tool definitions for function calling ────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculate_price',
      description:
        'Calculate the price of a custom cardboard box based on dimensions, type, and material. Use whenever customer asks about pricing or mentions a box size.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['dus_baru', 'dus_pizza'],
            description:
              'Box type: "dus_baru" for regular RSC boxes, "dus_pizza" for die-cut pizza boxes.',
          },
          panjang: {
            type: 'number',
            description: 'Length (panjang) in cm.',
          },
          lebar: {
            type: 'number',
            description: 'Width (lebar) in cm.',
          },
          tinggi: {
            type: 'number',
            description: 'Height (tinggi) in cm.',
          },
          material: {
            type: 'string',
            enum: ['singlewall', 'cflute', 'doublewall'],
            description:
              'Material type. Only for dus_baru. Ignored for dus_pizza. Default: singlewall.',
          },
          quantity: {
            type: 'number',
            description:
              'Number of boxes to order (optional, for total calculation).',
          },
          sablon_sides: {
            type: 'number',
            description:
              'Number of sides for sablon/printing (0-4). Each side adds Rp 500/pcs.',
          },
        },
        required: ['type', 'panjang', 'lebar', 'tinggi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_catalog_images',
      description:
        'Send the catalog opening photo to the customer via WhatsApp. Use on first greeting or when customer asks to see catalog. Only sends 1 image.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_sablon_samples',
      description:
        'Send sablon (printing) sample photos to the customer. ONLY use when customer specifically asks about sablon, printing, cetak logo, or wants to see sablon examples.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description:
        'Create a purchase order for custom cardboard boxes. Use when customer confirms they want to order after seeing a price quote.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of boxes to order',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['dus_baru', 'dus_pizza'],
                  description: 'Box type.',
                },
                panjang: {
                  type: 'number',
                  description: 'Length in cm.',
                },
                lebar: {
                  type: 'number',
                  description: 'Width in cm.',
                },
                tinggi: {
                  type: 'number',
                  description: 'Height in cm.',
                },
                material: {
                  type: 'string',
                  enum: ['singlewall', 'cflute', 'doublewall'],
                  description: 'Material type.',
                },
                quantity: {
                  type: 'number',
                  description: 'Number of boxes.',
                },
              },
              required: ['type', 'panjang', 'lebar', 'tinggi', 'quantity'],
            },
          },
          sablon_sides: {
            type: 'number',
            description:
              'Number of sides for sablon/printing (0-4). Each side adds Rp 500/pcs.',
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

WE MAKE CUSTOM BOXES — any size the customer needs. We do NOT have fixed inventory or catalog sizes.

BOX TYPES:
1. *Dus Baru* — Regular RSC (Regular Slotted Container) box. Available in 3 materials:
   - Singlewall (paling tipis, ringan) — cocok untuk barang ringan
   - C-Flute (sedang, lebih kuat) — cocok untuk barang sedang
   - Doublewall (paling tebal, kuat) — cocok untuk barang berat >10kg
2. *Dus Pizza* — Die-cut pizza box. Satu material saja. Cocok untuk pizza, makanan flat, dll.

PRICING:
- Price is calculated automatically based on dimensions (panjang × lebar × tinggi) and material.
- Always use the calculate_price tool to get prices. NEVER make up or estimate prices.
- Sablon (printing logo/text on box): +Rp 500 per side (1-4 sides).
- Delivery is FREE (gratis ongkir).

CRITICAL RULES:
- ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER switch to English.
- ALWAYS use calculate_price tool to get prices. NEVER make up or estimate prices.
- When customer mentions dimensions (e.g. "12x12x5"), IMMEDIATELY call calculate_price.
- When customer first greets or asks about boxes without specifying size, call send_catalog_images AND introduce what we offer.
- When customer describes a USE CASE (e.g. "buat bungkus bola golf"), YOU estimate the appropriate dimensions based on common sense, then call calculate_price. Do NOT ask for dimensions — you are the expert.
- For heavy items (>10kg), recommend doublewall material.
- NEVER fabricate bank accounts, payment info, or prices. ALWAYS use the appropriate tool.
- When customer wants to ORDER, you MUST call create_order tool. NEVER fake an order in text.
- When customer wants to PAY, you MUST call get_payment_info tool. NEVER make up payment details.

GREETING:
- When customer first says hello/halo/hi, respond with: "Halo, kak {{customerName}} 👋 kami supplier dus/kardus custom di Kapuk, Jakarta Barat 📍 Bisa bikin dus apa aja sesuai ukuran yang kakak butuhkan! Ada yang bisa dibantu?"
- Also call send_catalog_images on first greeting.
- Do NOT greet again if the conversation already has messages.

FLOW:
1. Customer asks about a box → call calculate_price with their dimensions/type
2. Present the price clearly: "Dus [type] ukuran PxLxT [material]: Rp X/pcs"
3. If customer gives quantity, calculate total and ask "Mau langsung order?"
4. Customer confirms → call create_order
5. After order → ask "Lanjut ke pembayaran?"
6. Customer confirms → call get_payment_info

WHEN CUSTOMER DESCRIBES A NEED:
- Estimate dimensions yourself. Example: "buat kemasan kue" → suggest 20x20x10 or similar.
- Show prices for multiple materials (singlewall + cflute) so customer can choose.
- Say "Ini rekomendasi saya ya kak:" then show the options.
- For pizza boxes, no material choice needed.

FORMATTING:
- Keep replies short (1-3 paragraphs) — this is WhatsApp.
- Format prices as "Rp X.XXX" with thousand separators.
- Use WhatsApp formatting: *bold* for emphasis.
- When showing price comparison, use a clear format.

ORDER FLOW — ABSOLUTE RULES:
- You MUST call create_order tool to place an order. NEVER write an order summary yourself.
- If you respond with order details WITHOUT calling create_order, the order is NOT saved and payment will FAIL.
- After create_order succeeds, copy-paste the ENTIRE tool output verbatim. Do NOT add anything.
- Then ask "Lanjut ke pembayaran?"
- When customer says YES/OK/BOLEH/LANJUT/GAS/YA after an order, you MUST call get_payment_info tool. NO EXCEPTIONS.

PAYMENT — ABSOLUTE RULES:
- We ONLY accept payment via DOKU online payment link. There is NO bank transfer, NO manual transfer.
- You MUST call get_payment_info tool to generate the payment link. NEVER make up payment info.
- NEVER mention bank account numbers. We do NOT have bank transfer. ONLY DOKU payment link.
- NEVER say "transfer ke rekening" or show any account numbers. This is STRICTLY FORBIDDEN.
- If customer asks about payment, call get_payment_info. ALWAYS.

SABLON INFO:
- Mention once: "Tersedia juga jasa sablon mulai Rp 500/sisi ya kak 😊"
- Do NOT repeatedly ask about sablon.
- Only call send_sablon_samples when customer ASKS about sablon/printing/cetak.
- On greeting, only send catalog opening image (send_catalog_images). Do NOT send sablon samples on greeting.`;

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
    const pendingImages: { phone: string; url: string; caption: string }[] = [];
    let reply = await this.runAgentLoop(
      chatMessages,
      customer,
      conversation,
      5,
      pendingImages,
    );

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

    // 7. Store outbound & send text reply first
    await this.messages.storeOutbound(conversation.id, reply);
    await this.conversations.touchOutbound(conversation.id);
    await this.gowa.sendText(payload.phone, reply);

    // 8. Send any pending images AFTER the text reply
    for (const img of pendingImages) {
      await this.gowa.sendImage(img.phone, img.url, img.caption);
    }
  }

  private async runAgentLoop(
    messages: OpenAI.ChatCompletionMessageParam[],
    customer: any,
    conversation: any,
    maxIterations = 8,
    pendingImages: { phone: string; url: string; caption: string }[] = [],
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
            pendingImages,
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

        // Reset nullCount after successful tool execution so LLM can
        // return text on the next iteration (tool_choice goes back to 'auto')
        nullCount = 0;

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
          pendingImages,
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
          `LLM returned empty on iteration ${i}, retrying (nullCount=${nullCount}, tool_choice=${nullCount >= 2 ? 'required' : 'auto'})`,
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
    pendingImages: { phone: string; url: string; caption: string }[] = [],
  ): Promise<string> {
    // Strip "default_api." prefix that some LLMs add
    const toolName = name.replace(/^default_api\./, '');
    try {
      switch (toolName) {
        case 'calculate_price': {
          const type = (args.type ?? 'dus_baru') as BoxType;
          const p = Number(args.panjang);
          const l = Number(args.lebar);
          const t = Number(args.tinggi);
          const material = (args.material ?? 'singlewall') as Material;
          const quantity = args.quantity ? Number(args.quantity) : undefined;
          const sablonSides = args.sablon_sides ? Number(args.sablon_sides) : 0;

          if (!p || !l || !t || p <= 0 || l <= 0 || t <= 0) {
            return 'Ukuran harus lebih dari 0. Mohon sebutkan panjang, lebar, dan tinggi dalam cm.';
          }

          if (type === 'dus_pizza') {
            const pricePerPcs = calculatePrice(type, p, l, t);
            const sheet = calculatePizzaSheet(p, l, t);

            if (quantity) {
              const totals = calculateTotal(pricePerPcs, quantity, sablonSides);
              let result = [
                `🍕 *Dus Pizza ${p}x${l}x${t} cm*`,
                `   Harga: ${this.formatRupiah(pricePerPcs)}/pcs`,
              ];
              if (sablonSides > 0) {
                result.push(
                  `   Sablon ${sablonSides} sisi: +${this.formatRupiah(totals.sablonPerPcs)}/pcs`,
                );
                result.push(
                  `   Total per pcs: ${this.formatRupiah(totals.totalPerPcs)}`,
                );
              }
              result.push(
                '',
                `📦 *${quantity} pcs × ${this.formatRupiah(totals.totalPerPcs)} = ${this.formatRupiah(totals.grandTotal)}*`,
                '',
                '🚚 Gratis ongkir!',
              );
              return result.join('\n');
            }

            return [
              `🍕 *Dus Pizza ${p}x${l}x${t} cm*`,
              `   Harga: *${this.formatRupiah(pricePerPcs)}/pcs*`,
              '',
              '🚚 Gratis ongkir!',
              '',
              'Mau pesan berapa pcs kak? 😊',
            ].join('\n');
          }

          // dus_baru — show all material options if no specific material requested
          const showAllMaterials = !args.material;

          if (showAllMaterials) {
            const prices = MATERIALS_DUS_BARU.map((mat) => ({
              material: mat,
              price: calculatePrice('dus_baru', p, l, t, mat),
            }));

            const materialLabels: Record<string, string> = {
              singlewall: 'Singlewall (tipis)',
              cflute: 'C-Flute (sedang)',
              doublewall: 'Doublewall (tebal)',
            };

            let lines = [`📦 *Dus Baru ${p}x${l}x${t} cm*`, ''];
            for (const { material: mat, price } of prices) {
              lines.push(
                `• *${materialLabels[mat]}*: ${this.formatRupiah(price)}/pcs`,
              );
            }

            if (quantity) {
              lines.push('', `Untuk *${quantity} pcs*:`);
              for (const { material: mat, price } of prices) {
                const totals = calculateTotal(price, quantity, sablonSides);
                let line = `• ${materialLabels[mat]}: ${this.formatRupiah(totals.grandTotal)}`;
                if (sablonSides > 0) {
                  line += ` (termasuk sablon ${sablonSides} sisi)`;
                }
                lines.push(line);
              }
            }

            lines.push('', '🚚 Gratis ongkir!');
            if (!quantity) {
              lines.push(
                '',
                'Pilih material mana dan mau pesan berapa pcs kak? 😊',
              );
            }

            return lines.join('\n');
          }

          // Specific material
          const pricePerPcs = calculatePrice(type, p, l, t, material);
          const materialLabels: Record<string, string> = {
            singlewall: 'Singlewall',
            cflute: 'C-Flute',
            doublewall: 'Doublewall',
          };

          if (quantity) {
            const totals = calculateTotal(pricePerPcs, quantity, sablonSides);
            let result = [
              `📦 *Dus Baru ${p}x${l}x${t} cm — ${materialLabels[material]}*`,
              `   Harga: ${this.formatRupiah(pricePerPcs)}/pcs`,
            ];
            if (sablonSides > 0) {
              result.push(
                `   Sablon ${sablonSides} sisi: +${this.formatRupiah(totals.sablonPerPcs)}/pcs`,
              );
              result.push(
                `   Total per pcs: ${this.formatRupiah(totals.totalPerPcs)}`,
              );
            }
            result.push(
              '',
              `📦 *${quantity} pcs × ${this.formatRupiah(totals.totalPerPcs)} = ${this.formatRupiah(totals.grandTotal)}*`,
              '',
              '🚚 Gratis ongkir!',
            );
            return result.join('\n');
          }

          return [
            `📦 *Dus Baru ${p}x${l}x${t} cm — ${materialLabels[material]}*`,
            `   Harga: *${this.formatRupiah(pricePerPcs)}/pcs*`,
            '',
            '🚚 Gratis ongkir!',
            '',
            'Mau pesan berapa pcs kak? 😊',
          ].join('\n');
        }

        case 'send_catalog_images': {
          const images = await this.catalogImages.findAll();
          if (images.length === 0) {
            return 'Foto katalog belum tersedia. Silakan sebutkan ukuran yang dibutuhkan, kami bisa buatkan custom sesuai kebutuhan!';
          }

          // Only send the first image (opening/catalog pic)
          const firstImage = images[0];
          pendingImages.push({
            phone: customer.phoneNumber,
            url: firstImage.imageUrl,
            caption:
              firstImage.title +
              (firstImage.description ? `\n${firstImage.description}` : ''),
          });

          const customerName = customer.name || 'kakak';
          return `Halo, kak ${customerName} 👋 kami supplier dus/kardus custom di Kapuk, Jakarta Barat 📍\n\nKami bisa bikin dus *custom ukuran apa aja*! Tinggal sebutkan ukuran (PxLxT) dan jenis dusnya (Dus Baru / Dus Pizza), nanti kami hitungkan harganya 😊\n\n🚚 Gratis ongkir!`;
        }

        case 'send_sablon_samples': {
          const images = await this.catalogImages.findAll();
          // Sablon samples are images after the first one (index 1+)
          const sablonImages = images.slice(1);
          if (sablonImages.length === 0) {
            return 'Foto contoh sablon belum tersedia. Sablon = cetak logo/tulisan di permukaan dus. Biaya Rp 500 per sisi (1-4 sisi).';
          }

          for (const img of sablonImages.slice(0, 3)) {
            pendingImages.push({
              phone: customer.phoneNumber,
              url: img.imageUrl,
              caption:
                img.title + (img.description ? `\n${img.description}` : ''),
            });
          }

          return `Ini contoh hasil sablon kami ya kak 📸\n\nSablon bisa di 1-4 sisi dus, biaya Rp 500/sisi. Kalau mau sablon, tinggal share desainnya ya kak 😊`;
        }

        case 'create_order': {
          const rawItems: {
            type: string;
            panjang: number;
            lebar: number;
            tinggi: number;
            material?: string;
            quantity: number;
          }[] = args.items ?? [];
          const sablonSides = args.sablon_sides ?? 0;
          const orderItems: any[] = [];
          const itemLines: string[] = [];
          let grandTotal = 0;

          for (const item of rawItems) {
            const boxType = (item.type ?? 'dus_baru') as BoxType;
            const mat = (item.material ?? 'singlewall') as Material;
            const p = Number(item.panjang);
            const l = Number(item.lebar);
            const t = Number(item.tinggi);
            const qty = Number(item.quantity) || 1;

            const pricePerPcs = calculatePrice(boxType, p, l, t, mat);
            const totals = calculateTotal(pricePerPcs, qty, sablonSides);

            const materialLabels: Record<string, string> = {
              singlewall: 'Singlewall',
              cflute: 'C-Flute',
              doublewall: 'Doublewall',
            };

            const typeLabel =
              boxType === 'dus_pizza' ? 'Dus Pizza' : 'Dus Baru';
            const matLabel =
              boxType === 'dus_pizza' ? '' : ` ${materialLabels[mat]}`;
            const productName = `${typeLabel} ${p}x${l}x${t}${matLabel}`;

            orderItems.push({
              quantity: qty,
              unitPrice: totals.totalPerPcs,
              productName,
              boxType,
              material: mat,
              panjang: p,
              lebar: l,
              tinggi: t,
            });

            grandTotal += totals.grandTotal;

            let line = `- ${productName} x${qty} @ ${this.formatRupiah(totals.totalPerPcs)} = ${this.formatRupiah(totals.grandTotal)}`;
            if (sablonSides > 0) {
              line += `\n  (sudah termasuk sablon ${sablonSides} sisi)`;
            }
            itemLines.push(line);
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
            '🚚 Gratis ongkir!',
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
