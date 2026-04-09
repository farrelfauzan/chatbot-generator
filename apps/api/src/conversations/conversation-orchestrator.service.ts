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
        'List all active products in the catalog. Use when the customer wants to see what is available.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category filter (e.g. Laptop, PC, Monitor, Accessories)',
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
        'Create a purchase order for a customer. Use when the customer explicitly confirms they want to buy/order a product.',
      parameters: {
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
];

const SYSTEM_PROMPT = `You are a friendly WhatsApp sales assistant for a computer & laptop store.

RULES:
- Respond in the same language the customer uses (Indonesian or English).
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Format prices as "Rp" with thousand separators (e.g. Rp 12.500.000).
- Use WhatsApp formatting: *bold* for emphasis, no markdown links.
- NEVER invent data about stock, prices, or order status — always use the tools to get real data.
- When a customer refers to a product by number (e.g. "no 3", "yang ke-2"), map it to the product list from the conversation history.
- When a customer wants to know about a product, search for it first before answering.
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
  ) {}

  async handleInboundMessage(payload: GowaInboundMessage): Promise<void> {
    // 1. Upsert customer
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

    // 4. Build conversation history for context
    const history = await this.messages.findByConversationId(conversation.id);
    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
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
    const reply = await this.runAgentLoop(
      chatMessages,
      customer,
      conversation,
    );

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
    for (let i = 0; i < maxIterations; i++) {
      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: appConfig.llm.maxTokens,
        temperature: appConfig.llm.temperature,
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

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

      // No tool calls — return the final text reply
      return assistantMsg.content?.trim() ?? 'Maaf, saya tidak bisa memproses pesan Anda saat ini.';
    }

    return 'Maaf, saya mengalami kesulitan memproses permintaan Anda. Bisa coba ulangi? 🙏';
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
            return JSON.stringify({ found: false, message: 'No products found matching the query.' });
          }
          return JSON.stringify({
            found: true,
            products: results.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category?.name ?? null,
              price: p.price,
              stockQty: p.stockQty,
              inStock: p.stockQty > 0,
            })),
          });
        }

        case 'list_catalog': {
          const products = await this.catalog.listActive(args.category);
          return JSON.stringify({
            products: products.map((p, i) => ({
              number: i + 1,
              name: p.name,
              category: p.category?.name ?? null,
              price: p.price,
              stockQty: p.stockQty,
              inStock: p.stockQty > 0,
            })),
          });
        }

        case 'get_product_detail': {
          const results = await this.catalog.search(args.product_name);
          if (results.length === 0) {
            return JSON.stringify({ found: false, message: 'Product not found.' });
          }
          const p = results[0];
          return JSON.stringify({
            found: true,
            product: {
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category?.name ?? null,
              price: p.price,
              stockQty: p.stockQty,
              inStock: p.stockQty > 0,
              imageUrl: p.imageUrl,
            },
          });
        }

        case 'create_order': {
          const matches = await this.catalog.search(args.product_name);
          if (matches.length === 0) {
            return JSON.stringify({ success: false, message: 'Product not found.' });
          }
          const product = matches[0];
          const qty = args.quantity ?? 1;

          if (product.stockQty < qty) {
            return JSON.stringify({
              success: false,
              message: `Insufficient stock. Only ${product.stockQty} available.`,
            });
          }

          const order = await this.orders.create({
            customerId: customer.id,
            conversationId: conversation.id,
            items: [{ productId: product.id, quantity: qty }],
          });

          await this.conversations.update(conversation.id, {
            stage: 'order_confirm',
          });

          return JSON.stringify({
            success: true,
            order: {
              orderNumber: order.orderNumber,
              product: product.name,
              quantity: qty,
              unitPrice: product.price,
              totalAmount: Number(order.totalAmount),
            },
          });
        }

        case 'get_order_status': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return JSON.stringify({ found: false, message: 'No orders found.' });
          }
          return JSON.stringify({
            found: true,
            order: {
              orderNumber: order.orderNumber,
              status: order.status,
              totalAmount: Number(order.totalAmount),
            },
          });
        }

        case 'generate_invoice': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return JSON.stringify({ success: false, message: 'No orders found.' });
          }
          const invoice = await this.invoices.generateForOrder(
            order.id,
            customer.id,
          );
          return JSON.stringify({
            success: true,
            invoice: {
              invoiceNumber: invoice.invoiceNumber,
              totalAmount: Number(invoice.totalAmount),
            },
          });
        }

        case 'confirm_payment': {
          const order = await this.orders.findLatestByCustomerId(customer.id);
          if (!order) {
            return JSON.stringify({ success: false, message: 'No active order to confirm payment for.' });
          }
          await this.payments.create({
            orderId: order.id,
            customerId: customer.id,
            amount: Number(order.totalAmount),
            referenceNumber: args.reference ?? '',
          });
          return JSON.stringify({ success: true, message: 'Payment confirmed.' });
        }

        case 'get_faq': {
          const entries = await this.faq.listActive();
          const filtered = args.topic
            ? entries.filter(
                (f) =>
                  f.category?.toLowerCase().includes(args.topic.toLowerCase()) ||
                  f.question.toLowerCase().includes(args.topic.toLowerCase()),
              )
            : entries;
          return JSON.stringify({
            faq: filtered.map((f) => ({
              question: f.question,
              answer: f.answer,
            })),
          });
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (err: any) {
      this.logger.error(`Tool ${name} failed: ${err.message}`);
      return JSON.stringify({ error: err.message });
    }
  }
}
