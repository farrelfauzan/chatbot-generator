import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CatalogImagesService } from '../catalog-images/catalog-images.service';
import { FaqService } from '../faq/faq.service';
import { OrdersService } from '../orders/orders.service';
import { GowaService } from '../gowa/gowa.service';
import { VectorSearchService } from '../vector-search/vector-search.service';
import { CustomerFilesService } from '../customer-files/customer-files.service';
import {
  ChatSessionService,
  type CartItem,
} from '../chat-session/chat-session.service';

import { DokuService } from '../doku/doku.service';
import type { DokuInvoiceResult } from '../doku/doku.service';
import { PromptTemplateService } from '../prompt-templates/prompt-template.service';
import { appConfig } from '../app.config';
import {
  calculatePrice,
  calculateTotal,
  calculatePizzaSheet,
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
              'Box type: "dus_baru" for Dus Indomie (regular RSC boxes), "dus_pizza" for die-cut pizza boxes.',
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
      name: 'add_to_cart',
      description:
        "Add a box item to the customer's cart. You MUST call this tool whenever customer wants to order — saying 'added to cart' in text does NOT actually add anything. Call this when customer mentions quantity with buying intent (e.g. 'pesan 100', 'mau 50pcs', 'ini juga 100 ya').",
      parameters: {
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
          sablon_sides: {
            type: 'number',
            description: 'Number of sides for sablon/printing (0-4).',
          },
        },
        required: ['type', 'panjang', 'lebar', 'tinggi', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'view_cart',
      description:
        "Show the current items in the customer's cart and order summary. Call this IMMEDIATELY when customer says they are done adding items (e.g. 'sudah', 'itu aja', 'cukup', 'gak ada lagi', 'udah', 'segitu aja'). Also use when customer asks to see their cart.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description:
        'Remove an item from the cart by its item number (1-based index).',
      parameters: {
        type: 'object',
        properties: {
          item_number: {
            type: 'number',
            description:
              'The item number to remove (1-based, as shown in cart).',
          },
        },
        required: ['item_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_cart_item',
      description:
        'Update an existing item in the cart (e.g. change quantity, add/change sablon, change material). Use this instead of adding a duplicate when customer wants to modify an item already in the cart.',
      parameters: {
        type: 'object',
        properties: {
          item_number: {
            type: 'number',
            description:
              'The item number to update (1-based, as shown in cart).',
          },
          quantity: {
            type: 'number',
            description: 'New quantity (if changing).',
          },
          material: {
            type: 'string',
            enum: ['singlewall', 'cflute', 'doublewall'],
            description: 'New material (if changing).',
          },
          sablon_sides: {
            type: 'number',
            description:
              'Number of sablon sides (0-4). Set to 0 to remove sablon.',
          },
        },
        required: ['item_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'collect_recipient_info',
      description:
        'Start collecting recipient/shipping info before placing the order. Call this when the customer confirms the order summary (e.g. "ya", "ok", "lanjut"). This transitions to recipient info collection. Do NOT call confirm_order directly — always collect recipient info first.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_order',
      description:
        'Confirm and place the order with recipient/shipping details. ONLY call this after you have collected ALL three: recipient name, phone number, and shipping address. All three fields are REQUIRED.',
      parameters: {
        type: 'object',
        properties: {
          recipient_name: {
            type: 'string',
            description: 'Recipient name (nama penerima).',
          },
          recipient_phone: {
            type: 'string',
            description: 'Recipient phone number (no HP penerima).',
          },
          recipient_address: {
            type: 'string',
            description: 'Full shipping address (alamat lengkap pengiriman).',
          },
        },
        required: ['recipient_name', 'recipient_phone', 'recipient_address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description:
        'Cancel the current order or clear the cart. Use when customer explicitly says they want to cancel (e.g. "batal", "cancel", "ga jadi", "nggak jadi"). This clears the cart and closes the conversation. After calling this, relay the tool result as-is. Do NOT add a new greeting or re-introduce yourself — the conversation is finished.',
      parameters: { type: 'object', properties: {} },
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
      name: 'search_knowledge',
      description:
        'Search the knowledge base for ANY customer question — product info, food grade, materials, pricing, delivery, payment, cancellation, sablon, policies, FAQ, business hours, etc. ALWAYS use this tool first when a customer asks a question. This is your primary source of truth.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "Search query — use the customer's question or topic in Indonesian",
          },
          source_type: {
            type: 'string',
            enum: [
              'pricing',
              'business_info',
              'policy',
              'faq_knowledge',
              'all',
            ],
            description:
              'Filter by knowledge source type. Use "all" or omit to search everything.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_info',
      description:
        'Generate or resend the DOKU payment link for an existing confirmed order. ONLY use when customer already has a confirmed order and asks to pay or asks for the payment link again.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_admin',
      description:
        'Connect customer to a human admin/CS. Use when: (1) customer explicitly asks to speak to admin/CS/human, (2) customer has a complaint you cannot resolve, (3) customer is frustrated and needs human attention. Do NOT use just because search_knowledge returned no results.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description:
              'Brief reason for escalation (e.g. "customer minta bicara admin", "komplain pengiriman")',
          },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handle_complaint',
      description:
        'Handle order complaints from customer. If the customer provides specific complaint details (e.g. "dus penyok", "salah ukuran", "belum sampai"), call this tool IMMEDIATELY with the complaint. If they only say they want to complain without details (e.g. "mau komplain", "ada masalah"), ask what the issue is first, then call this tool.',
      parameters: {
        type: 'object',
        properties: {
          complaint: {
            type: 'string',
            description:
              'The customer complaint details (e.g. "dus penyok saat diterima", "ukuran tidak sesuai", "pesanan belum sampai").',
          },
        },
        required: ['complaint'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handle_urgent_delivery',
      description:
        'Handle urgent/fast delivery requests. If the customer specifies a timeframe (e.g. "besok", "hari ini", "2 hari"), call this tool IMMEDIATELY. If they only say they need it fast without a timeframe (e.g. "bisa cepat?", "butuh urgent"), ask how soon they need it first, then call this tool.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            description:
              'How fast the customer wants delivery (e.g. "besok", "hari ini", "2 hari", "minggu ini").',
          },
        },
        required: ['timeframe'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handle_stubborn_customer',
      description:
        "Escalate when a customer keeps asking the SAME thing over and over even though you already answered or declined it. Examples: asking for a product we don't sell after being told we don't have it, bargaining after price was already rejected, requesting a service we don't offer repeatedly. Call this when the customer has asked the SAME question/request 3+ times and you have already given a clear answer each time. Do NOT use on the first or second attempt — only on the 3rd+ repetition.",
      parameters: {
        type: 'object',
        properties: {
          issue: {
            type: 'string',
            description:
              'Brief description of what the customer keeps insisting on (e.g. "terus menerus nego harga setelah ditolak", "minta model dus yang tidak tersedia berulang kali").',
          },
        },
        required: ['issue'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handle_bargain',
      description:
        'Handle price bargaining/negotiation from customer. If the customer provides a specific price (e.g. "bisa 4 juta?", "3.5 jt ya", "harga 2 juta bisa?"), call this tool IMMEDIATELY with their requested_price. If they only express bargaining intent without a price (e.g. "bisa kurang?", "diskon dong", "nego dong"), ask them how much they want first, then call this tool once they answer.',
      parameters: {
        type: 'object',
        properties: {
          requested_price: {
            type: 'number',
            description:
              'The price the customer wants to pay (in IDR). This is the bargained/requested price from the customer.',
          },
        },
        required: ['requested_price'],
      },
    },
  },
];

const ORCHESTRATOR_SLUG = 'conversation-orchestrator';

const FALLBACK_PROMPT = `You are a friendly WhatsApp sales assistant for Mader Packer, a cardboard box (dus/kardus) supplier located in Kapuk, Jakarta Barat.
Respond in Indonesian. For ANY customer question, ALWAYS call search_knowledge first to get the answer from our knowledge base. Never answer from memory. Never make up prices or payment info.`;

const PIC_PHONE = '6287822992838';

const GREETING_TEMPLATE = (name: string) =>
  `Halo kak ${name} 👋 Kami *Mader Packer*, supplier dus custom di Kapuk, Jakarta Barat 📍\n\n2 jenis dus:\n1. *Dus Indomie* (RSC)\n2. *Dus Pizza* (die-cut)\n\n🚚 *FREE ONGKIR* se-Jabodetabek!\n\nAda yang bisa dibantu kak? 😊`;

@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  private readonly openai = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
    timeout: 60_000, // 60s hard timeout per request
  });

  constructor(
    private readonly customers: CustomersService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly catalogImages: CatalogImagesService,
    private readonly faq: FaqService,
    private readonly orders: OrdersService,
    private readonly gowa: GowaService,
    private readonly chatSession: ChatSessionService,
    private readonly doku: DokuService,
    private readonly promptTemplates: PromptTemplateService,
    private readonly vectorSearch: VectorSearchService,
    private readonly customerFiles: CustomerFilesService,
  ) {}

  async handleInboundMessage(payload: GowaInboundMessage): Promise<void> {
    const customer = await this.customers.upsertByPhone(payload.phone, {
      ...(payload.senderName ? { name: payload.senderName } : {}),
    });

    const { conversation, priorConversationId } =
      await this.resolveConversation(customer, payload.phone);

    await this.messages.storeInbound(conversation.id, payload.message, {
      gatewayMessageId: payload.messageId,
      rawPayload: payload as any,
    });
    await this.conversations.touchInbound(conversation.id);

    // Handle media attachment (design files, photos, etc.)
    let mediaContext = '';
    if (payload.mediaUrl) {
      try {
        const savedFile = await this.customerFiles.saveFromWhatsApp({
          customerId: customer.id,
          conversationId: conversation.id,
          mediaUrl: payload.mediaUrl,
          mimeType: payload.mediaType || 'application/octet-stream',
          originalName: payload.mediaFilename || 'file',
        });
        this.logger.log(
          `Media saved: ${savedFile.originalName} (${savedFile.id})`,
        );
        mediaContext = `\n[SYSTEM: Customer sent a file (${savedFile.originalName}, ${savedFile.mimeType}). It has been automatically saved as a design reference. Acknowledge receipt of the file in your response.]`;

        // If media-only (no meaningful text), acknowledge and return
        if (!payload.message || payload.message === '[Media tanpa caption]') {
          const reply =
            'File diterima kak ✅ Desainnya sudah kami simpan. Silakan lanjut chat atau kirim file lainnya ya 😊';
          await this.messages.storeOutbound(conversation.id, reply);
          await this.conversations.touchOutbound(conversation.id);
          await this.gowa.sendText(payload.phone, reply);
          return;
        }
      } catch (err) {
        this.logger.error(`Failed to save media: ${(err as Error).message}`);
        // Continue processing the text message even if media save fails
      }
    }

    // First greeting — deterministic reply + catalog image
    if (conversation.stage === 'greeting' && !priorConversationId) {
      await this.handleGreeting(conversation, customer, payload.phone);
      return;
    }

    // Build LLM context and run agent loop
    const chatMessages = await this.buildChatMessages(
      customer,
      conversation,
      priorConversationId,
      payload.phone,
    );

    // Inject media context so LLM knows a file was received
    if (mediaContext) {
      chatMessages.push({ role: 'system', content: mediaContext });
    }

    const pendingImages: { phone: string; url: string }[] = [];
    let reply = await this.runAgentLoop(
      chatMessages,
      customer,
      conversation,
      8,
      pendingImages,
    );

    reply = reply.replace(/\\n/g, '\n');
    await this.sendReply(conversation.id, payload.phone, reply, pendingImages);
  }

  // ─── Private: Conversation Resolution ────────────────

  private async resolveConversation(
    customer: any,
    phone: string,
  ): Promise<{ conversation: any; priorConversationId: string | null }> {
    let conversation: any;
    let priorConversationId: string | null = null;
    const existingSession = await this.chatSession.getSession(phone);

    if (existingSession) {
      conversation = await this.conversations.findById(
        existingSession.conversationId,
      );
      if (!conversation || conversation.status !== 'active') {
        if (conversation?.closeReason === 'session_expired') {
          priorConversationId = existingSession.conversationId;
        }
        conversation = await this.conversations.create(customer.id);
      }
      await this.chatSession.refreshSession(phone);
    } else {
      const lastConvo = await this.conversations.findLatestByCustomerId(
        customer.id,
      );
      if (lastConvo && lastConvo.closeReason === 'session_expired') {
        priorConversationId = lastConvo.id;
      }
      conversation = await this.conversations.create(customer.id);
    }

    await this.chatSession.createSession(phone, {
      conversationId: conversation.id,
      customerId: customer.id,
      phone,
      lastActivity: new Date().toISOString(),
    });

    return { conversation, priorConversationId };
  }

  // ─── Private: Greeting ──────────────────────────────

  private async handleGreeting(
    conversation: any,
    customer: any,
    phone: string,
  ): Promise<void> {
    const images = await this.catalogImages.findAll();
    const greetingReply = GREETING_TEMPLATE(customer.name || 'kakak');

    await this.messages.storeOutbound(conversation.id, greetingReply);
    await this.conversations.touchOutbound(conversation.id);
    await this.conversations.update(conversation.id, { stage: 'pricing' });
    await this.gowa.sendText(phone, greetingReply);

    if (images.length > 0) {
      const img = images[0];
      await this.gowa.sendImage(phone, img.imageUrl);
    }
  }

  // ─── Private: Build LLM Chat Messages ───────────────

  private async buildChatMessages(
    customer: any,
    conversation: any,
    priorConversationId: string | null,
    phone: string,
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const systemPrompt = await this.promptTemplates.resolve(
      ORCHESTRATOR_SLUG,
      { customerName: customer.name || 'kakak' },
      FALLBACK_PROMPT,
    );

    const stageHint = this.buildStageHint(conversation.stage);
    const customerContext = `\nCUSTOMER INFO:\n- Name: ${customer.name || 'Unknown'}\n- Phone: ${customer.phoneNumber}\n${stageHint}`;

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt + customerContext },
    ];

    if (priorConversationId) {
      await this.buildPriorContext(
        chatMessages,
        conversation,
        priorConversationId,
        phone,
      );
    }

    const history = await this.messages.findByConversationId(conversation.id);
    for (const msg of history.slice(-20)) {
      chatMessages.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return chatMessages;
  }

  private buildStageHint(stage: string): string {
    switch (stage) {
      case 'collecting_items':
        return [
          '\n⚠️ CONVERSATION STAGE: collecting_items',
          'The customer is building their cart. There are items in the cart already.',
          'If the customer wants to add more items, use add_to_cart. You MUST call the tool, not just say you added it.',
          'If the customer says they are done (e.g. "sudah", "itu aja", "sudah itu aja", "cukup", "gak ada lagi", "udah", "segitu aja", "engga", "ngga", "no"), call view_cart IMMEDIATELY.',
          'Do NOT confirm_order yet — show the summary first via view_cart.\n',
        ].join('\n');
      case 'order_summary':
        return [
          '\n⚠️ CONVERSATION STAGE: order_summary',
          'The customer has been shown the order summary and is deciding whether to confirm.',
          'CRITICAL: If the customer says ANYTHING affirmative (e.g. "ya", "ok", "oke", "benar", "betul", "lanjut", "order", "iya", "yoi", "yup", "sip", "gas", "jadi", "deal", "siap", "boleh"), you MUST call collect_recipient_info IMMEDIATELY. Do NOT call confirm_order directly.',
          'If the customer wants to change items, help them modify the cart (add_to_cart / remove_from_cart / update_cart_item).',
          'If the customer wants to cancel, use cancel_order.\n',
        ].join('\n');
      case 'collecting_recipient':
        return [
          '\n⚠️ CONVERSATION STAGE: collecting_recipient',
          'You are collecting shipping/recipient info before placing the order.',
          'You need THREE things: (1) Nama penerima, (2) No HP penerima, (3) Alamat lengkap pengiriman.',
          'If the customer provides ALL three in one message, call confirm_order IMMEDIATELY with all three fields.',
          'If the customer provides partial info, acknowledge what you have and ask for the missing fields.',
          'Do NOT call confirm_order until you have ALL three fields.\n',
        ].join('\n');
      case 'order_confirm':
        return [
          '\n⚠️ CONVERSATION STAGE: order_confirm',
          'The customer has a confirmed order. A payment link was already sent (or attempted).',
          'If the customer asks for the payment link again, or says "bayar", or asks how to pay, call get_payment_info to generate/resend the link.',
          'If the customer wants to cancel or change the order, respond naturally.',
          'Do NOT ask "Lanjut ke pembayaran?" — the payment link was already provided.\n',
        ].join('\n');
      case 'bargaining':
        return [
          '\n⚠️ CONVERSATION STAGE: bargaining',
          'The customer has attempted to bargain/negotiate the price.',
          'The bargain was already processed. If they ask again, you can re-explain that the price is fixed (for orders under 5 juta) or that admin will follow up (for orders 5 juta+).',
          'If the customer wants to continue ordering at the original price, proceed normally.\n',
        ].join('\n');
      default:
        return '';
    }
  }

  private async buildPriorContext(
    chatMessages: OpenAI.ChatCompletionMessageParam[],
    conversation: any,
    priorConversationId: string,
    phone: string,
  ): Promise<void> {
    const priorConvo = (await this.conversations.findById(
      priorConversationId,
    )) as any;

    // Restore cart
    if (priorConvo?.cartSnapshot) {
      const cartItems = priorConvo.cartSnapshot as any[];
      for (const item of cartItems) {
        await this.chatSession.addToCart(phone, item);
      }
      await this.conversations.update(conversation.id, {
        stage: 'collecting_items',
      });
      conversation.stage = 'collecting_items';
      this.logger.log(
        `Restored ${cartItems.length} cart items from prior conversation`,
      );
    }

    // Inject prior messages
    const priorHistory =
      await this.messages.findByConversationId(priorConversationId);
    const priorMessages = priorHistory.slice(-20);
    if (priorMessages.length > 0) {
      chatMessages.push({
        role: 'system',
        content:
          '--- PREVIOUS CONVERSATION (session expired due to inactivity, customer is back) ---\nUse the following history to maintain context. Do NOT greet again.',
      });
      for (const msg of priorMessages) {
        chatMessages.push({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
      chatMessages.push({
        role: 'system',
        content:
          '--- END OF PREVIOUS CONVERSATION ---\nContinue from where you left off.',
      });
    }

    // Inform about restored cart
    if (priorConvo?.cartSnapshot) {
      const cartItems = priorConvo.cartSnapshot as any[];
      const cartSummary = cartItems
        .map(
          (item: any, i: number) =>
            `${i + 1}. ${item.productName} x${item.quantity} - Rp${item.unitPrice?.toLocaleString('id-ID')}/pcs`,
        )
        .join('\n');
      chatMessages.push({
        role: 'system',
        content: `⚠️ CART RESTORED:\n${cartSummary}\nAcknowledge the cart is still saved and ask if they want to continue or make changes.`,
      });
    }
  }

  // ─── Private: Send Reply ─────────────────────────────

  private async sendReply(
    conversationId: string,
    phone: string,
    reply: string,
    pendingImages: { phone: string; url: string }[],
  ): Promise<void> {
    if (!reply || !reply.trim()) {
      this.logger.warn('Agent loop returned empty reply, sending fallback');
      reply =
        'Maaf, saya tidak bisa memproses pesan Anda saat ini. Bisa coba ulangi? 🙏';
    }

    await this.messages.storeOutbound(conversationId, reply);
    await this.conversations.touchOutbound(conversationId);
    await this.gowa.sendText(phone, reply);

    for (const img of pendingImages) {
      await this.gowa.sendImage(img.phone, img.url);
    }
  }

  private async runAgentLoop(
    messages: OpenAI.ChatCompletionMessageParam[],
    customer: any,
    conversation: any,
    maxIterations = 8,
    pendingImages: { phone: string; url: string }[] = [],
  ): Promise<string> {
    let lastToolResult: string | null = null;

    let nullCount = 0;

    for (let i = 0; i < maxIterations; i++) {
      // Force search_knowledge on first iteration to prevent hallucination.
      // The LLM MUST consult the knowledge base before responding.
      // Exception: stages where cart/order tools are more relevant.
      let toolChoice: OpenAI.ChatCompletionToolChoiceOption = 'auto';
      if (i === 0 && !lastToolResult) {
        const stage = conversation.stage;
        if (stage === 'order_summary') {
          // Detect if customer is confirming the order
          const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
          const userText = (
            lastUserMsg && 'content' in lastUserMsg
              ? (lastUserMsg.content as string)
              : ''
          )
            .toLowerCase()
            .trim();
          const CONFIRM_WORDS = [
            'ya',
            'ok',
            'oke',
            'benar',
            'betul',
            'lanjut',
            'order',
            'iya',
            'yoi',
            'yup',
            'sip',
            'gas',
            'jadi',
            'deal',
            'siap',
            'boleh',
            'acc',
            'setuju',
            'confirm',
            'bener',
            'yaa',
            'iyaa',
            'lanjutin',
            'proses',
          ];
          const isConfirming = CONFIRM_WORDS.some(
            (w) =>
              userText === w ||
              userText.startsWith(w + ' ') ||
              userText.endsWith(' ' + w),
          );
          if (isConfirming) {
            toolChoice = {
              type: 'function',
              function: { name: 'collect_recipient_info' },
            };
          } else {
            toolChoice = 'required';
          }
        } else if (stage === 'collecting_items') {
          // Detect if customer is done adding items
          const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
          const userText = (
            lastUserMsg && 'content' in lastUserMsg
              ? (lastUserMsg.content as string)
              : ''
          )
            .toLowerCase()
            .trim();
          const DONE_WORDS = [
            'sudah',
            'itu aja',
            'cukup',
            'gak ada lagi',
            'udah',
            'segitu aja',
            'engga',
            'ngga',
            'no',
            'udah itu aja',
            'sudah itu aja',
            'ga ada',
            'gak ada',
            'nggak',
            'tidak',
            'itu saja',
            'itu doang',
            'sekian',
          ];
          const isDone = DONE_WORDS.some(
            (w) => userText === w || userText.includes(w),
          );
          if (isDone) {
            toolChoice = {
              type: 'function',
              function: { name: 'view_cart' },
            };
          } else {
            toolChoice = 'required';
          }
        } else if (stage === 'order_confirm') {
          // Customer has confirmed order, let LLM pick tool (get_payment_info, etc.)
          toolChoice = 'required';
        } else if (stage === 'collecting_recipient') {
          // Customer is providing recipient info, let LLM decide (confirm_order when all info collected)
          toolChoice = 'required';
        } else {
          // For general questions, force search_knowledge specifically
          toolChoice = {
            type: 'function',
            function: { name: 'search_knowledge' },
          };
        }
      } else if (nullCount >= 2) {
        toolChoice = 'required';
      }

      let completion: OpenAI.ChatCompletion;
      try {
        completion = await this.openai.chat.completions.create({
          model: appConfig.llm.model,
          messages,
          tools: TOOLS,
          tool_choice: toolChoice,
          max_tokens: appConfig.llm.maxTokens,
          temperature: appConfig.llm.temperature,
        });
      } catch (err: any) {
        this.logger.error(
          `LLM request failed on iteration ${i}: ${err.message ?? err}`,
        );
        // If we already have a tool result, return it instead of crashing
        if (lastToolResult) {
          this.logger.warn('Returning lastToolResult after LLM timeout/error');
          return lastToolResult;
        }
        throw err;
      }

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      this.logger.debug(
        `LLM iteration ${i}: finish_reason=${choice.finish_reason}, tool_calls=${assistantMsg.tool_calls?.length ?? 0}, content=${assistantMsg.content?.substring(0, 100) ?? 'null'}`,
      );

      // If the LLM wants to call tools
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push(assistantMsg);

        let lastToolWasKnowledgeSearch = false;

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

          const fnName = toolCall.function.name.replace(/^default_api\./, '');
          if (fnName === 'search_knowledge' || fnName === 'get_faq') {
            lastToolWasKnowledgeSearch = true;
          } else {
            lastToolWasKnowledgeSearch = false;
          }

          // For order-critical tools, return result directly — don't let LLM rephrase
          const DIRECT_RELAY_TOOLS = [
            'confirm_order',
            'cancel_order',
            'view_cart',
            'add_to_cart',
            'update_cart_item',
            'remove_from_cart',
            'get_payment_info',
            'escalate_to_admin',
            'handle_bargain',
            'handle_complaint',
            'handle_urgent_delivery',
            'handle_stubborn_customer',
            'collect_recipient_info',
          ];
          if (DIRECT_RELAY_TOOLS.includes(fnName)) {
            return result;
          }

          lastToolResult = result;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        // For knowledge search, NEVER bypass LLM — it must synthesize a natural reply
        if (lastToolWasKnowledgeSearch) {
          lastToolResult = null;
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
    pendingImages: { phone: string; url: string }[] = [],
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
                `🍕 *Dus Pizza* ${p}×${l}×${t} cm`,
                `Harga: ${this.formatRupiah(pricePerPcs)}/pcs`,
              ];
              if (sablonSides > 0) {
                result.push(
                  `Sablon ${sablonSides} sisi: +${this.formatRupiah(totals.sablonPerPcs)}/pcs`,
                );
              }
              result.push(
                ``,
                `*${quantity} pcs = ${this.formatRupiah(totals.grandTotal)}*`,
              );
              return result.join('\n');
            }

            return `🍕 *Dus Pizza* ${p}×${l}×${t} cm\nHarga: *${this.formatRupiah(pricePerPcs)}/pcs*\n\nMau pesan berapa pcs kak?`;
          }

          // dus_baru — default to singlewall if no specific material requested

          // Specific material (defaults to singlewall)
          const pricePerPcs = calculatePrice(type, p, l, t, material);
          const materialLabels: Record<string, string> = {
            singlewall: 'Singlewall',
            cflute: 'C-Flute',
            doublewall: 'Doublewall',
          };

          if (quantity) {
            const totals = calculateTotal(pricePerPcs, quantity, sablonSides);
            let result = [
              `📦 *Dus Indomie — ${materialLabels[material]}* ${p}×${l}×${t} cm`,
              `Harga: ${this.formatRupiah(pricePerPcs)}/pcs`,
            ];
            if (sablonSides > 0) {
              result.push(
                `Sablon ${sablonSides} sisi: +${this.formatRupiah(totals.sablonPerPcs)}/pcs`,
              );
            }
            result.push(
              ``,
              `*${quantity} pcs = ${this.formatRupiah(totals.grandTotal)}*`,
            );
            return result.join('\n');
          }

          return `📦 *Dus Indomie — ${materialLabels[material]}* ${p}×${l}×${t} cm\nHarga: *${this.formatRupiah(pricePerPcs)}/pcs*\n\nMau pesan berapa pcs kak?`;
        }

        case 'send_catalog_images': {
          const images = await this.catalogImages.findAll();
          if (images.length === 0) {
            return 'Foto katalog belum tersedia. Silakan sebutkan ukuran yang dibutuhkan, kami bisa buatkan custom sesuai kebutuhan!';
          }

          const firstImage = images[0];
          pendingImages.push({
            phone: customer.phoneNumber,
            url: firstImage.imageUrl,
          });

          return GREETING_TEMPLATE(customer.name || 'kakak');
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
            });
          }

          return `Ini contoh sablon kami kak 📸\nBiaya Rp 500/sisi (1-4 sisi). Kirim desainnya ya kak 😊`;
        }

        case 'add_to_cart': {
          const boxType = (args.type ?? 'dus_baru') as BoxType;
          const mat = (args.material ?? 'singlewall') as Material;
          const p = Number(args.panjang);
          const l = Number(args.lebar);
          const t = Number(args.tinggi);
          const qty = Number(args.quantity) || 1;
          const sablonSides = args.sablon_sides ? Number(args.sablon_sides) : 0;

          if (!p || !l || !t || p <= 0 || l <= 0 || t <= 0) {
            return 'Ukuran harus lebih dari 0. Mohon sebutkan panjang, lebar, dan tinggi dalam cm.';
          }

          const pricePerPcs = calculatePrice(boxType, p, l, t, mat);
          const totals = calculateTotal(pricePerPcs, qty, sablonSides);

          const materialLabels: Record<string, string> = {
            singlewall: 'Singlewall',
            cflute: 'C-Flute',
            doublewall: 'Doublewall',
          };

          const typeLabel =
            boxType === 'dus_pizza' ? 'Dus Pizza' : 'Dus Indomie';
          const matLabel =
            boxType === 'dus_pizza' ? '' : ` ${materialLabels[mat]}`;
          const productName = `${typeLabel} (P:${p} × L:${l} × T:${t} cm)${matLabel}`;

          const cartItem: CartItem = {
            type: boxType,
            panjang: p,
            lebar: l,
            tinggi: t,
            material: mat,
            quantity: qty,
            sablonSides,
            unitPrice: totals.totalPerPcs,
            productName,
          };

          const cart = await this.chatSession.addToCart(
            customer.phoneNumber,
            cartItem,
          );

          await this.conversations.update(conversation.id, {
            stage: 'collecting_items',
          });

          let line = `${productName} x${qty} @ ${this.formatRupiah(totals.totalPerPcs)} = ${this.formatRupiah(totals.grandTotal)}`;
          if (sablonSides > 0) {
            line += ` (termasuk sablon ${sablonSides} sisi)`;
          }

          return `✅ Ditambahkan:\n${line}\n\n🛒 ${cart.length} item di keranjang. Ada lagi kak?`;
        }

        case 'view_cart': {
          const cart = await this.chatSession.getCart(customer.phoneNumber);
          if (cart.length === 0) {
            return '🛒 Keranjang masih kosong. Mau pesan dus apa kak?';
          }

          const itemLines: string[] = [];
          let grandTotal = 0;
          for (let idx = 0; idx < cart.length; idx++) {
            const item = cart[idx];
            const lineTotal = item.unitPrice * item.quantity;
            grandTotal += lineTotal;
            let line = `${idx + 1}. ${item.productName} x${item.quantity} @ ${this.formatRupiah(item.unitPrice)} = ${this.formatRupiah(lineTotal)}`;
            if (item.sablonSides > 0) {
              line += `\n   (sablon ${item.sablonSides} sisi)`;
            }
            itemLines.push(line);
          }

          await this.conversations.update(conversation.id, {
            stage: 'order_summary',
          });

          return [
            '🛒 *Ringkasan Pesanan:*',
            '',
            ...itemLines,
            '',
            `*Total: ${this.formatRupiah(grandTotal)}*`,
            '',
            'Sudah benar kak? Lanjut order?',
          ].join('\n');
        }

        case 'remove_from_cart': {
          const itemNum = Number(args.item_number);
          const cart = await this.chatSession.getCart(customer.phoneNumber);

          if (cart.length === 0) {
            return '🛒 Keranjang sudah kosong.';
          }
          if (itemNum < 1 || itemNum > cart.length) {
            return `Nomor item tidak valid. Pilih antara 1-${cart.length}.`;
          }

          const removed = cart[itemNum - 1];
          const updatedCart = await this.chatSession.removeFromCart(
            customer.phoneNumber,
            itemNum - 1,
          );

          if (updatedCart.length === 0) {
            await this.conversations.update(conversation.id, {
              stage: 'pricing',
            });
            return `❌ *${removed.productName}* dihapus dari keranjang.\n\n🛒 Keranjang sekarang kosong. Mau pesan yang lain kak?`;
          }

          return `❌ *${removed.productName}* dihapus dari keranjang.\n\n🛒 Sisa ${updatedCart.length} item di keranjang. Mau lihat ringkasan atau tambah lagi?`;
        }

        case 'update_cart_item': {
          const itemNum = Number(args.item_number);
          const cart = await this.chatSession.getCart(customer.phoneNumber);

          if (cart.length === 0) {
            return '🛒 Keranjang masih kosong.';
          }
          if (itemNum < 1 || itemNum > cart.length) {
            return `Nomor item tidak valid. Pilih antara 1-${cart.length}.`;
          }

          const idx = itemNum - 1;
          const existing = cart[idx];

          // Determine updated values
          const newQty =
            args.quantity !== undefined
              ? Number(args.quantity)
              : existing.quantity;
          const newMat = (args.material ?? existing.material) as Material;
          const newSablon =
            args.sablon_sides !== undefined
              ? Number(args.sablon_sides)
              : existing.sablonSides;

          // Recalculate price with updated params
          const boxType = existing.type as BoxType;
          const pricePerPcs = calculatePrice(
            boxType,
            existing.panjang,
            existing.lebar,
            existing.tinggi,
            newMat,
          );
          const totals = calculateTotal(pricePerPcs, newQty, newSablon);

          const materialLabels: Record<string, string> = {
            singlewall: 'Singlewall',
            cflute: 'C-Flute',
            doublewall: 'Doublewall',
          };
          const typeLabel =
            boxType === 'dus_pizza' ? 'Dus Pizza' : 'Dus Indomie';
          const matLabel =
            boxType === 'dus_pizza' ? '' : ` ${materialLabels[newMat]}`;
          const productName = `${typeLabel} (P:${existing.panjang} × L:${existing.lebar} × T:${existing.tinggi} cm)${matLabel}`;

          await this.chatSession.updateCartItem(customer.phoneNumber, idx, {
            material: newMat,
            quantity: newQty,
            sablonSides: newSablon,
            unitPrice: totals.totalPerPcs,
            productName,
          });

          const lineTotal = totals.totalPerPcs * newQty;
          let line = `${productName} x${newQty} @ ${this.formatRupiah(totals.totalPerPcs)} = ${this.formatRupiah(lineTotal)}`;
          if (newSablon > 0) {
            line += ` (termasuk sablon ${newSablon} sisi)`;
          }

          const changes: string[] = [];
          if (
            args.sablon_sides !== undefined &&
            newSablon !== existing.sablonSides
          ) {
            changes.push(
              newSablon > 0
                ? `sablon ${newSablon} sisi ditambahkan`
                : 'sablon dihapus',
            );
          }
          if (args.material && newMat !== existing.material) {
            changes.push(`material diubah ke ${materialLabels[newMat]}`);
          }
          if (args.quantity !== undefined && newQty !== existing.quantity) {
            changes.push(`jumlah diubah ke ${newQty} pcs`);
          }

          return `✏️ Item #${itemNum} diperbarui${changes.length > 0 ? ' (' + changes.join(', ') + ')' : ''}:\n${line}\n\nAda lagi kak?`;
        }

        case 'collect_recipient_info': {
          await this.conversations.update(conversation.id, {
            stage: 'collecting_recipient',
          });

          return '📋 Sebelum order dikonfirmasi, kami butuh data pengiriman ya kak:\n\n1. *Nama penerima*\n2. *No HP penerima*\n3. *Alamat lengkap pengiriman*\n\nSilakan kirim datanya kak 😊';
        }

        case 'confirm_order': {
          const recipientName = args.recipient_name;
          const recipientPhone = args.recipient_phone;
          const recipientAddress = args.recipient_address;

          if (!recipientName || !recipientPhone || !recipientAddress) {
            return 'Data pengiriman belum lengkap kak. Mohon kirimkan:\n1. Nama penerima\n2. No HP penerima\n3. Alamat lengkap pengiriman';
          }

          const cart = await this.chatSession.getCart(customer.phoneNumber);
          if (cart.length === 0) {
            return 'Keranjang kosong. Belum ada item untuk di-order.';
          }

          const orderItems: any[] = [];
          const itemLines: string[] = [];
          let grandTotal = 0;

          for (const item of cart) {
            const lineTotal = item.unitPrice * item.quantity;
            grandTotal += lineTotal;

            orderItems.push({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              productName: item.productName,
              boxType: item.type,
              material: item.material,
              panjang: item.panjang,
              lebar: item.lebar,
              tinggi: item.tinggi,
            });

            let line = `- ${item.productName} x${item.quantity} @ ${this.formatRupiah(item.unitPrice)} = ${this.formatRupiah(lineTotal)}`;
            if (item.sablonSides > 0) {
              line += `\n  (sudah termasuk sablon ${item.sablonSides} sisi)`;
            }
            itemLines.push(line);
          }

          // Enforce minimum order Rp 300.000
          if (grandTotal < 300000) {
            return `Maaf kak, minimal order kami Rp 300.000 ya.\nTotal saat ini: ${this.formatRupiah(grandTotal)}.\nSilakan tambah item lagi kak 😊`;
          }

          const order = await this.orders.create({
            customerId: customer.id,
            conversationId: conversation.id,
            items: orderItems,
            recipientName,
            recipientPhone,
            recipientAddress,
          });

          // Link any uploaded design files to this order
          await this.customerFiles.linkToOrder(conversation.id, order.id);

          // Clear cart after order is created
          await this.chatSession.clearCart(customer.phoneNumber);

          // Attempt to create DOKU payment link immediately
          let paymentSection: string[] = [];
          if (this.doku.isConfigured) {
            const dokuResult: DokuInvoiceResult = await this.doku.createInvoice(
              {
                orderId: order.orderNumber,
                amount: Number(order.totalAmount),
                customerName: customer.name || 'Customer',
                customerPhone: customer.phoneNumber,
                description: `Pembayaran pesanan ${order.orderNumber}`,
              },
            );

            if (dokuResult.ok) {
              paymentSection = [
                '',
                '💳 *Pembayaran Online (DOKU)*',
                'Klik link berikut untuk bayar:',
                dokuResult.invoiceUrl,
                '',
                '_Bisa bayar via VA, QRIS, e-wallet, atau kartu kredit._',
                '_Link berlaku 1 jam._',
              ];
            } else {
              paymentSection = [
                '',
                dokuResult.error === 'TIMEOUT'
                  ? 'Maaf kak, sistem pembayaran sedang lambat. Ketik "bayar" untuk coba lagi ya 🙏'
                  : 'Maaf kak, link pembayaran belum bisa dibuat saat ini. Ketik "bayar" untuk coba lagi ya 🙏',
              ];
            }
          }

          await this.conversations.update(conversation.id, {
            stage: 'order_confirm',
          });

          return [
            '✅ *Pesanan dibuat!*',
            `No: *${order.orderNumber}*`,
            '',
            '📦 *Data Pengiriman:*',
            `Nama: ${recipientName}`,
            `HP: ${recipientPhone}`,
            `Alamat: ${recipientAddress}`,
            '',
            ...itemLines,
            '',
            `*Total: ${this.formatRupiah(Number(order.totalAmount))}*`,
            ...paymentSection,
          ].join('\n');
        }

        case 'cancel_order': {
          // Clear cart
          await this.chatSession.clearCart(customer.phoneNumber);

          // Cancel the latest pending order if any
          const latestOrder = await this.orders.findLatestByCustomerId(
            customer.id,
          );
          if (latestOrder && latestOrder.status === 'draft') {
            await this.orders.updateStatus(latestOrder.id, 'cancelled');
          }

          // Close conversation and session
          await this.conversations.update(conversation.id, {
            status: 'closed',
            closeReason: 'user_cancelled',
          });
          await this.chatSession.deleteSession(customer.phoneNumber);

          return '❌ Pesanan dibatalkan. Kalau mau pesan lagi, chat aja ya kak! 😊';
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
          // Redirect to search_knowledge with faq_knowledge source type
          const topic = args.topic || '';
          const results = await this.vectorSearch.searchKnowledge(topic, {
            sourceType: 'faq_knowledge',
            topK: 5,
          });
          if (results.length === 0) {
            return 'Tidak ada FAQ yang cocok. Coba tanyakan langsung ya kak.';
          }
          const faqLines = results.map(
            (r, i: number) => `${i + 1}. ${r.content}`,
          );
          return faqLines.join('\n\n');
        }

        case 'search_knowledge': {
          const query = args.query || '';
          const sourceType =
            args.source_type && args.source_type !== 'all'
              ? args.source_type
              : undefined;
          const results = await this.vectorSearch.searchKnowledge(query, {
            sourceType,
            topK: 5,
          });

          this.logger.debug(
            `search_knowledge("${query}") → ${results.length} results${results.length > 0 ? ` (top similarity: ${results[0]?.similarity?.toFixed(3)})` : ''}`,
          );

          if (results.length === 0) {
            // No relevant results — notify PIC, but let LLM respond naturally
            const customerName = customer.name || 'Customer';
            await this.gowa.sendText(
              PIC_PHONE,
              `⚠️ Customer ${customerName} (${customer.phoneNumber}) butuh bantuan.\nPertanyaan: "${query}"`,
            );

            return 'Tidak ditemukan informasi yang relevan di knowledge base. Balas customer: "Baik kak, kami diskusikan dulu dengan tim ya. Nanti dibalas secepatnya 🙏"';
          }

          // If top result has low similarity, knowledge is likely irrelevant — also notify PIC
          const topSimilarity = results[0]?.similarity ?? 0;
          if (topSimilarity < 0.4) {
            const customerName = customer.name || 'Customer';
            await this.gowa.sendText(
              PIC_PHONE,
              `⚠️ Customer ${customerName} (${customer.phoneNumber}) butuh bantuan.\nPertanyaan: "${query}" (knowledge kurang relevan, similarity: ${topSimilarity.toFixed(2)})`,
            );
          }

          const lines = results.map(
            (r, i) =>
              `${i + 1}. [${r.sourceType}] *${r.title}*\n   ${r.content}`,
          );
          return lines.join('\n\n');
        }

        case 'get_payment_info': {
          const latestOrder = await this.orders.findLatestByCustomerId(
            customer.id,
          );

          if (!latestOrder) {
            return 'Belum ada pesanan kak. Silakan pesan dulu, nanti link pembayaran otomatis dikirim setelah order dikonfirmasi ya 😊';
          }

          if (latestOrder.status === 'cancelled') {
            return 'Pesanan terakhir sudah dibatalkan kak. Silakan buat pesanan baru ya 😊';
          }

          if (this.doku.isConfigured) {
            const dokuResult: DokuInvoiceResult = await this.doku.createInvoice(
              {
                orderId: latestOrder.orderNumber,
                amount: Number(latestOrder.totalAmount),
                customerName: customer.name || 'Customer',
                customerPhone: customer.phoneNumber,
                description: `Pembayaran pesanan ${latestOrder.orderNumber}`,
              },
            );

            if (dokuResult.ok) {
              return [
                '💳 *Pembayaran Online (DOKU)*',
                `No. Pesanan: *${latestOrder.orderNumber}*`,
                `Total: *${this.formatRupiah(Number(latestOrder.totalAmount))}*`,
                '',
                'Klik link berikut untuk bayar:',
                dokuResult.invoiceUrl,
                '',
                '_Bisa bayar via VA, QRIS, e-wallet, atau kartu kredit._',
                '_Link berlaku 1 jam._',
              ].join('\n');
            }

            return [
              '💳 *Pembayaran*',
              '',
              `No. Pesanan: *${latestOrder.orderNumber}*`,
              `Total: *${this.formatRupiah(Number(latestOrder.totalAmount))}*`,
              '',
              dokuResult.error === 'TIMEOUT'
                ? 'Maaf kak, sistem pembayaran sedang lambat. Coba ketik "bayar" lagi beberapa saat ya 🙏'
                : 'Maaf kak, sistem pembayaran sedang gangguan. Coba ketik "bayar" lagi beberapa saat ya 🙏',
            ].join('\n');
          }

          return 'Sistem pembayaran belum tersedia saat ini. Hubungi admin untuk info pembayaran ya kak 🙏';
        }

        case 'escalate_to_admin': {
          const reason = args.reason || 'Customer minta bicara admin';
          const customerName = customer.name || 'Customer';
          await this.gowa.sendText(
            PIC_PHONE,
            `⚠️ Customer ${customerName} (${customer.phoneNumber}) butuh bantuan admin.\nAlasan: ${reason}`,
          );

          return 'Baik kak, kami sambungkan dengan tim ya. Nanti dibalas secepatnya 🙏';
        }

        case 'handle_bargain': {
          const requestedPrice = Number(args.requested_price);
          const customerName = customer.name || 'kakak';

          // Get current cart total to determine bargain eligibility
          const cart = await this.chatSession.getCart(customer.phoneNumber);
          let cartTotal = 0;
          for (const item of cart) {
            cartTotal += item.unitPrice * item.quantity;
          }

          // If cart is empty, check latest order total
          if (cart.length === 0) {
            const latestOrder = await this.orders.findLatestByCustomerId(
              customer.id,
            );
            if (latestOrder) {
              cartTotal = Number(latestOrder.totalAmount);
            }
          }

          // Below IDR 5 million — reject bargain
          if (cartTotal < 5_000_000) {
            await this.conversations.update(conversation.id, {
              stage: 'bargaining',
            });
            return `Maaf ka ${customerName}, harga segitu kita belum bisa 🙏`;
          }

          // IDR 5 million or above — escalate to admin for negotiation
          await this.conversations.update(conversation.id, {
            stage: 'bargaining',
          });
          const reason = `Customer nego harga. Total pesanan: ${this.formatRupiah(cartTotal)}, harga diminta: ${this.formatRupiah(requestedPrice)}`;
          await this.gowa.sendText(
            PIC_PHONE,
            `⚠️ Customer ${customerName} (${customer.phoneNumber}) minta nego harga.\nTotal: ${this.formatRupiah(cartTotal)}\nHarga diminta: ${this.formatRupiah(requestedPrice)}\nAlasan: ${reason}`,
          );

          return 'Baik kak, untuk nego harga kami sambungkan dengan tim ya. Nanti dibalas secepatnya 🙏';
        }

        case 'handle_complaint': {
          const complaint = args.complaint || 'Komplain pesanan';
          const customerName = customer.name || 'Customer';

          // Get latest order info for context
          const latestOrder = await this.orders.findLatestByCustomerId(
            customer.id,
          );
          const orderInfo = latestOrder
            ? `\nNo. Pesanan: ${latestOrder.orderNumber}, Status: ${latestOrder.status}, Total: ${this.formatRupiah(Number(latestOrder.totalAmount))}`
            : '\nTidak ada pesanan tercatat.';

          await this.gowa.sendText(
            PIC_PHONE,
            `🚨 KOMPLAIN dari ${customerName} (${customer.phoneNumber})\nKeluhan: ${complaint}${orderInfo}`,
          );

          return `Terima kasih sudah menyampaikan keluhannya kak 🙏\nKami sudah teruskan ke tim kami. Admin akan segera menghubungi kakak untuk menyelesaikan masalah ini ya.`;
        }

        case 'handle_urgent_delivery': {
          const timeframe = args.timeframe || 'secepatnya';
          const customerName = customer.name || 'Customer';

          const latestOrder = await this.orders.findLatestByCustomerId(
            customer.id,
          );
          const orderInfo = latestOrder
            ? `\nNo. Pesanan: ${latestOrder.orderNumber}, Total: ${this.formatRupiah(Number(latestOrder.totalAmount))}`
            : '';

          await this.gowa.sendText(
            PIC_PHONE,
            `🚀 PENGIRIMAN CEPAT\nCustomer ${customerName} (${customer.phoneNumber}) minta pengiriman cepat: *${timeframe}*${orderInfo}`,
          );

          return `Baik kak, permintaan pengiriman cepat (${timeframe}) sudah kami sampaikan ke tim 🙏\nAdmin akan segera menghubungi kakak untuk konfirmasi jadwal pengiriman ya.`;
        }

        case 'handle_stubborn_customer': {
          const issue =
            args.issue || 'Customer terus mengulangi permintaan yang sama';
          const customerName = customer.name || 'Customer';

          await this.gowa.sendText(
            PIC_PHONE,
            `⚠️ BUTUH BANTUAN ADMIN\nCustomer ${customerName} (${customer.phoneNumber}) butuh penanganan langsung.\nMasalah: ${issue}`,
          );

          return `Baik kak, kami sambungkan dengan admin untuk membantu lebih lanjut ya 🙏\nMohon ditunggu sebentar, admin akan segera menghubungi kakak.`;
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
