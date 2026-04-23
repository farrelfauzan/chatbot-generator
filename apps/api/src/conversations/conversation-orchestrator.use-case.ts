import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { CustomersService } from '../customers/customers.service';

dayjs.extend(utc);
dayjs.extend(timezone);
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { GowaProvider } from '../gowa/gowa.provider';
import { VectorSearchService } from '../vector-search/vector-search.service';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { SoulService } from '../soul/soul.service';
import { PrayerService } from '../prayer/prayer.service';
import { MemoService } from '../memo/memo.service';
import { QuranService } from '../quran/quran.service';
import { QuotesService } from '../quotes/quotes.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { appConfig } from '../app.config';
import type { GowaInboundMessage } from '@chatbot-generator/shared-types';

// ─── Zod schemas for tool argument validation (anti-hallucination) ───

const toolArgSchemas: Record<string, z.ZodSchema> = {
  get_prayer_times: z.object({
    city: z.string().min(1).max(100),
    country: z.string().max(50).default('Indonesia'),
  }),
  set_prayer_reminder: z.object({
    city: z.string().min(1).max(100),
    prayers: z
      .array(z.string())
      .default(['all'])
      .describe(
        'Array of prayer keys: Fajr, Dhuhr, Asr, Maghrib, Isha, or "all"',
      ),
  }),
  disable_prayer_reminder: z.object({}),
  get_prayer_reminder_status: z.object({}),
  save_memo: z.object({
    content: z.string().min(1).max(5000),
    title: z.string().max(200).optional(),
    reminder_time: z.string().optional(),
  }),
  list_memos: z.object({}),
  get_memo: z.object({
    memo_number: z.number().int().min(1).max(100),
  }),
  delete_memo: z.object({
    memo_number: z.number().int().min(1).max(100),
  }),
  search_memos: z.object({
    query: z.string().min(1).max(500),
  }),
  schedule_message: z.object({
    message: z.string().min(1).max(2000),
    scheduled_time: z.string().min(1),
    repeat_interval: z.enum(['daily', 'weekly', 'monthly']).optional(),
    target_phone: z.string().optional(),
    target_name: z.string().optional(),
  }),
  list_scheduled_messages: z.object({}),
  cancel_scheduled_message: z.object({
    schedule_number: z.number().int().min(1).max(100),
  }),
  search_quran: z.object({
    query: z.string().min(1).max(500),
  }),
  get_ayah: z.object({
    surah: z.number().int().min(1).max(114),
    ayah: z.number().int().min(1).max(300),
  }),
  search_knowledge: z.object({
    query: z.string().min(1).max(500),
  }),
  get_daily_quote: z.object({
    category: z.enum(['islamic', 'motivational', 'productivity']).optional(),
  }),
  escalate_to_admin: z.object({
    reason: z.string().min(1).max(500),
  }),
  direct_reply: z.object({
    message: z.string().min(1).max(4000),
  }),
};

// ─── Tool definitions for function calling ────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_prayer_times',
      description:
        "Get today's prayer times for a location. Use when user asks about prayer schedule or shalat times.",
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name (e.g., "Jakarta", "Malang")',
          },
          country: {
            type: 'string',
            description: 'Country name. Default: "Indonesia"',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_prayer_reminder',
      description:
        "Set automatic prayer time reminders. User chooses which prayers to be reminded about: specific ones (Subuh, Dzuhur, Ashar, Maghrib, Isya) or all. If the user's city is already known from USER CONTEXT or from a previous get_prayer_times call in this conversation, use that city — do NOT ask again.",
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description:
              'City name for prayer time calculation. Use the city from USER CONTEXT (Lokasi) or from previous get_prayer_times call if available. Only ask user if no city is known.',
          },
          prayers: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Which prayers to remind. Values: "Fajr" (Subuh), "Dhuhr" (Dzuhur), "Asr" (Ashar), "Maghrib", "Isha" (Isya), or "all" for all 5 prayers. Default: ["all"]',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'disable_prayer_reminder',
      description: 'Disable/turn off prayer time reminders for the user.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_prayer_reminder_status',
      description:
        'Check current prayer reminder status & settings for the user. Use when user asks to see/list their prayer reminders, or asks "pengingat shalat apa aja", "list reminder", "cek pengingat".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memo',
      description:
        'Save a note/memo for the user. Use when user says "catat", "simpan", "ingat", "note", or asks to remember something. Preserve ALL details — do NOT summarize.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description:
              'The FULL memo content exactly as the user stated. Do NOT summarize or shorten.',
          },
          title: {
            type: 'string',
            description: 'Short title for the memo (optional)',
          },
          reminder_time: {
            type: 'string',
            description:
              'ISO 8601 datetime string to remind about this memo (optional). Only set if user explicitly asks for a reminder.',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_memos',
      description:
        'List all saved memos/notes for the user. Use when user asks to see their notes or memos.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_memo',
      description: 'Get the full content of a specific memo by its number.',
      parameters: {
        type: 'object',
        properties: {
          memo_number: {
            type: 'number',
            description: 'The memo number to view (1-based, as shown in list)',
          },
        },
        required: ['memo_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_memo',
      description: 'Delete a specific memo by its number.',
      parameters: {
        type: 'object',
        properties: {
          memo_number: {
            type: 'number',
            description: 'The memo number to delete (1-based)',
          },
        },
        required: ['memo_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_memos',
      description: "Search through the user's saved memos by keyword or topic.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find in memos',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_message',
      description:
        'Schedule a WhatsApp message or reminder to be sent at a specific time. Use when user says "ingatkan", "remind me", "jadwalkan pesan", "kirim jam X". Do NOT use this when user says "catat", "simpan", "note" — use save_memo instead. Defaults to sending to the user themselves.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message/reminder content to send',
          },
          scheduled_time: {
            type: 'string',
            description:
              'ISO 8601 datetime string for when to send the message/reminder',
          },
          target_phone: {
            type: 'string',
            description:
              "Target phone number with country code (optional, defaults to user's own number)",
          },
          target_name: {
            type: 'string',
            description: 'Name of the recipient (optional)',
          },
          repeat_interval: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly'],
            description:
              'Make this a repeating reminder/message. "daily" = every day, "weekly" = every week, "monthly" = every month. Only set if user explicitly asks for recurring/repeating. Default: one-time (do not set).',
          },
        },
        required: ['message', 'scheduled_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_scheduled_messages',
      description:
        'List all pending scheduled messages and reminders for the user. Use when user asks to see their reminders or scheduled messages.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_scheduled_message',
      description: 'Cancel a pending scheduled message.',
      parameters: {
        type: 'object',
        properties: {
          schedule_number: {
            type: 'number',
            description: 'The schedule number to cancel (1-based)',
          },
        },
        required: ['schedule_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_quran',
      description:
        'Search the Quran by keyword, surah name, or ayah reference. Use for tafsir, meaning, or surah info.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query — surah name, keyword, or reference (e.g., "Al-Fatihah", "sabar", "2:255")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ayah',
      description:
        'Get a specific Quran verse with Arabic text and Indonesian translation.',
      parameters: {
        type: 'object',
        properties: {
          surah: {
            type: 'number',
            description: 'Surah number (1-114)',
          },
          ayah: {
            type: 'number',
            description: 'Ayah/verse number',
          },
        },
        required: ['surah', 'ayah'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for Islamic information, hadith, daily practices, dua, and general questions. ALWAYS use this first for any Islamic question before answering.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query in Indonesian or Arabic',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_quote',
      description:
        "Get today's motivational/Islamic quote. Use when user asks for quote, motivation, or inspiration.",
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['islamic', 'motivational', 'productivity'],
            description: 'Quote category. Default: islamic',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_admin',
      description:
        'Connect user to a human admin when they need help beyond AI capabilities.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for escalation',
          },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'direct_reply',
      description:
        'Send a direct text reply to the user WITHOUT performing any action. Use ONLY for: greetings, small talk, clarifying questions, or when no other tool is needed. Do NOT use this when the user asks to set reminders, save memos, get prayer times, or any other action — use the appropriate tool instead.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The reply message to send to the user',
          },
        },
        required: ['message'],
      },
    },
  },
];

const PIC_PHONE = '6287822992838';

const HELP_TEXT = `Hai! Ini yang bisa Wulan bantu 😊

✅ *Pengingat Shalat*: Otomatis sesuai lokasi kamu
✅ *Memo Cerdas*: Simpan ide atau tugas dengan "Catat..."
✅ *WhatsApp Scheduler*: Jadwalkan pesan ke kontak mana pun
✅ *Wawasan Islami*: Tanya tafsir, info surah, atau hadits
✅ *Quotes Harian*: Motivasi harian untuk kamu
✅ *Integrasi Google Calendar*: Kelola event lewat chat

Ketik /help kapan saja untuk melihat ini lagi.`;

const ONBOARDING_GREETING = (name: string) =>
  `Halo ${name} 👋 Kenalin, aku *Wulan* — asisten pribadi kamu di WhatsApp!\n\nAku bisa bantu kamu mengingat jadwal, mencatat memo, mengingatkan waktu shalat, dan banyak lagi.\n\nBoleh tau nama panggilan kamu? 😊`;

const ONBOARDING_ASK_LOCATION = (nickname: string) =>
  `Salam kenal, ${nickname}! 🤗\n\nSekarang, kamu tinggal di kota mana? Wulan butuh ini untuk jadwal shalat dan pengingat waktu ibadah kamu 🕌`;

@Injectable()
export class ConversationOrchestratorUseCase {
  private readonly logger = new Logger(ConversationOrchestratorUseCase.name);

  private readonly openai = new OpenAI({
    apiKey: appConfig.llm.apiKey || 'missing-key',
    baseURL: appConfig.llm.baseUrl,
    timeout: 60_000,
  });

  constructor(
    private readonly customers: CustomersService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly gowa: GowaProvider,
    private readonly chatSession: ChatSessionService,
    private readonly soul: SoulService,
    private readonly prayer: PrayerService,
    private readonly memo: MemoService,
    private readonly quran: QuranService,
    private readonly quotes: QuotesService,
    private readonly scheduler: SchedulerService,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  async handleInboundMessage(payload: GowaInboundMessage): Promise<void> {
    this.logger.log(
      `📥 Inbound from ${payload.phone}: "${payload.message.substring(0, 200)}"`,
    );

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

    // Handle /help command — no LLM call needed
    if (payload.message.trim().toLowerCase() === '/help') {
      await this.sendReply(conversation.id, payload.phone, HELP_TEXT);
      return;
    }

    // Handle onboarding for new users
    if (!customer.onboardingDone) {
      await this.handleOnboarding(conversation, customer, payload);
      return;
    }

    // Build LLM context and run agent loop
    const userContext = await this.soul.buildUserContext(
      customer.id,
      payload.message,
    );
    const chatMessages = await this.buildChatMessages(
      customer,
      conversation,
      priorConversationId,
      userContext,
    );

    let reply = await this.runAgentLoop(
      chatMessages,
      customer,
      conversation,
      6,
    );

    reply = reply.replace(/\\n/g, '\n');
    await this.sendReply(conversation.id, payload.phone, reply);
  }

  // ─── Private: Onboarding ────────────────────────────

  private async handleOnboarding(
    conversation: any,
    customer: any,
    payload: GowaInboundMessage,
  ): Promise<void> {
    const stage = conversation.stage;

    if (stage === 'greeting') {
      const greeting = ONBOARDING_GREETING(customer.name || 'Kak');
      await this.conversations.update(conversation.id, {
        stage: 'onboarding',
      });
      await this.sendReply(conversation.id, payload.phone, greeting);
      return;
    }

    if (stage === 'onboarding') {
      if (!customer.nickname) {
        const nickname = await this.extractNickname(payload.message);
        if (!nickname) {
          const reply = `Hmm, Wulan belum bisa menangkap namanya 🤔\n\nCoba sebutkan nama panggilan kamu saja ya, contoh: *Farrel*, *Aisyah*, *Budi*`;
          await this.sendReply(conversation.id, payload.phone, reply);
          return;
        }
        await this.customers.update(customer.id, { nickname });

        const reply = ONBOARDING_ASK_LOCATION(nickname);
        await this.sendReply(conversation.id, payload.phone, reply);
        return;
      }

      // User is responding with their location — extract city name via LLM
      const cityName = await this.extractCityName(payload.message);
      if (!cityName) {
        const reply = `Hmm, Wulan belum bisa mengenali kota dari pesanmu 🤔\n\nCoba sebutkan nama kotanya saja ya, contoh: *Jakarta*, *Bandung*, *Surabaya*`;
        await this.sendReply(conversation.id, payload.phone, reply);
        return;
      }

      // Determine IANA timezone from location
      const timezone = await this.extractTimezone(cityName);

      await this.customers.update(customer.id, {
        location: cityName,
        timezone,
        onboardingDone: true,
      } as any);

      await this.conversations.update(conversation.id, { stage: 'active' });

      const reply = [
        `Terima kasih, ${customer.nickname}! 🎉`,
        '',
        `📍 Lokasi: ${cityName}`,
        '',
        'Sekarang kamu bisa langsung chat Wulan untuk apapun yang kamu butuhkan!',
        'Tanya aja "jadwal shalat" kapan pun kamu butuh 🕌',
        '',
        'Ketik /help untuk lihat semua fitur.',
      ].join('\n');

      await this.sendReply(conversation.id, payload.phone, reply);
      return;
    }
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

  // ─── Private: Build LLM Chat Messages (Soul System) ──

  private async buildChatMessages(
    customer: any,
    conversation: any,
    priorConversationId: string | null,
    userContext: any,
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    // Layer 1: Soul (identity)
    const soulContent = this.soul.getSoul();

    // Layer 2: Abilities (features)
    const abilitiesContent = this.soul.getAbilities();

    // Layer 3: User Context (from DB)
    const userContextStr = this.soul.formatUserContextForPrompt(userContext);

    // Assemble system prompt from all layers
    const tz = userContext.timezone || 'Asia/Jakarta';
    const nowLocal = dayjs().tz(tz);
    const dateTimeStr = nowLocal.format('dddd, D MMMM YYYY HH:mm');
    const isoDate = nowLocal.format('YYYY-MM-DD');
    const tomorrowISO = nowLocal.add(1, 'day').format('YYYY-MM-DD');
    const timeContext = [
      '## WAKTU SEKARANG',
      `- Tanggal & Jam: ${dateTimeStr}`,
      `- ISO Date Hari Ini: ${isoDate}`,
      `- ISO Date Besok: ${tomorrowISO}`,
      `- Timezone: ${tz}`,
      '',
      `Gunakan tanggal di atas saat user menyebut "besok", "lusa", "hari ini", dll. Selalu gunakan ISO 8601 format DENGAN timezone offset untuk scheduled_time (contoh: ${isoDate}T09:00:00+07:00).`,
    ].join('\n');

    const systemPrompt = [
      soulContent,
      abilitiesContent,
      userContextStr,
      timeContext,
    ].join('\n\n---\n\n');

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Inject prior conversation context if session expired
    if (priorConversationId) {
      await this.buildPriorContext(chatMessages, priorConversationId);
    }

    // Layer 4: Conversation history
    const history = await this.messages.findByConversationId(conversation.id);
    for (const msg of history.slice(-20)) {
      chatMessages.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return chatMessages;
  }

  private async buildPriorContext(
    chatMessages: OpenAI.ChatCompletionMessageParam[],
    priorConversationId: string,
  ): Promise<void> {
    try {
      const priorHistory =
        await this.messages.findByConversationId(priorConversationId);
      const priorMessages = priorHistory.slice(-10);
      if (priorMessages.length > 0) {
        chatMessages.push({
          role: 'system',
          content:
            '--- PERCAKAPAN SEBELUMNYA (sesi berakhir karena tidak aktif) ---\nGunakan konteks berikut. JANGAN sapa ulang.',
        });
        for (const msg of priorMessages) {
          chatMessages.push({
            role: msg.direction === 'inbound' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
        chatMessages.push({
          role: 'system',
          content: '--- AKHIR PERCAKAPAN SEBELUMNYA ---\nLanjutkan dari sini.',
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to build prior context: ${(err as Error).message}`,
      );
    }
  }

  // ─── Private: Extract City Name ──────────────────────

  private async extractNickname(userMessage: string): Promise<string | null> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages: [
          {
            role: 'system',
            content:
              'Extract the person\'s nickname or name from the user message. Return ONLY the clean name in proper case (e.g. "Farrel", "Aisyah", "Budi"). If the message contains a full sentence like "nama aku Farrel" or "panggil aja Budi", extract just the name. If no name can be identified, return "UNKNOWN". No explanation.',
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 30,
        temperature: 0,
      });
      const result = completion.choices[0]?.message?.content?.trim();
      if (!result || result === 'UNKNOWN') return null;
      return result.split('\n')[0].substring(0, 50);
    } catch (err) {
      this.logger.warn(
        `Nickname extraction failed: ${(err as Error).message}, falling back to raw input`,
      );
      return userMessage.trim().substring(0, 50) || null;
    }
  }

  private async extractCityName(userMessage: string): Promise<string | null> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages: [
          {
            role: 'system',
            content:
              'Extract the location name from the user message. It can be a city, regency (kabupaten), province, island, or region anywhere in the world. Return ONLY the clean location name in proper case (e.g. "Jakarta", "Bali", "Papua", "Tokyo", "London"). If no location can be identified, return "UNKNOWN". No explanation.',
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 30,
        temperature: 0,
      });
      const result = completion.choices[0]?.message?.content?.trim();
      if (!result || result === 'UNKNOWN') return null;
      // Sanitize: take only the first line, max 100 chars
      return result.split('\n')[0].substring(0, 100);
    } catch (err) {
      this.logger.warn(
        `City extraction failed: ${(err as Error).message}, falling back to raw input`,
      );
      // Fallback: use raw input trimmed
      return userMessage.trim().substring(0, 100) || null;
    }
  }

  private async extractTimezone(location: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: appConfig.llm.model,
        messages: [
          {
            role: 'system',
            content:
              'Given a location name, return the IANA timezone identifier for that location. Return ONLY the timezone string, nothing else. Examples:\n- "Jakarta" → "Asia/Jakarta"\n- "Denpasar" → "Asia/Makassar"\n- "Bali" → "Asia/Makassar"\n- "Papua" → "Asia/Jayapura"\n- "Makassar" → "Asia/Makassar"\n- "Tokyo" → "Asia/Tokyo"\n- "London" → "Europe/London"\n- "New York" → "America/New_York"\nIf unsure, return "Asia/Jakarta".',
          },
          { role: 'user', content: location },
        ],
        max_tokens: 30,
        temperature: 0,
      });
      const result = completion.choices[0]?.message?.content?.trim();
      if (result) {
        const test = dayjs().tz(result);
        if (test.isValid()) return result;
      }
      return 'Asia/Jakarta';
    } catch (err) {
      this.logger.warn(
        `Timezone extraction failed: ${(err as Error).message}, defaulting to Asia/Jakarta`,
      );
      return 'Asia/Jakarta';
    }
  }

  // ─── Private: Send Reply ─────────────────────────────

  private async sendReply(
    conversationId: string,
    phone: string,
    reply: string,
  ): Promise<void> {
    if (!reply || !reply.trim()) {
      this.logger.warn('Agent loop returned empty reply, sending fallback');
      reply =
        'Maaf, aku tidak bisa memproses pesanmu saat ini. Coba ulangi ya 🙏';
    }

    await this.messages.storeOutbound(conversationId, reply);
    await this.conversations.touchOutbound(conversationId);
    this.logger.log(`📤 Reply to ${phone}: ${reply.substring(0, 300)}`);
    try {
      await this.gowa.sendText(phone, reply);
    } catch (err) {
      this.logger.warn(
        `GoWA send failed (reply already stored): ${(err as Error).message}`,
      );
    }
  }

  // ─── Private: Agent Loop ─────────────────────────────

  private async runAgentLoop(
    messages: OpenAI.ChatCompletionMessageParam[],
    customer: any,
    conversation: any,
    maxIterations = 6,
  ): Promise<string> {
    let lastToolResult: string | null = null;

    for (let i = 0; i < maxIterations; i++) {
      const toolChoice: OpenAI.ChatCompletionToolChoiceOption =
        i === 0 ? 'required' : 'auto';

      this.logger.log(
        `🔄 Agent loop iteration ${i}/${maxIterations} | tool_choice=${typeof toolChoice === 'string' ? toolChoice : JSON.stringify(toolChoice)}`,
      );

      let completion: OpenAI.ChatCompletion;
      try {
        completion = await this.openai.chat.completions.create({
          model: appConfig.llm.model,
          messages,
          tools: TOOLS,
          tool_choice: toolChoice,
          max_tokens: appConfig.llm.maxTokens,
          temperature: 0.3, // Low temperature for less hallucination
        });
      } catch (err: any) {
        this.logger.error(
          `LLM request failed on iteration ${i}: ${err.message ?? err}`,
        );
        if (lastToolResult) return lastToolResult;
        return 'Maaf, aku sedang mengalami gangguan. Coba lagi nanti ya 🙏';
      }

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      this.logger.debug(
        `LLM iteration ${i}: finish=${choice.finish_reason}, tools=${assistantMsg.tool_calls?.length ?? 0}, content=${assistantMsg.content?.substring(0, 100) ?? '(none)'}`,
      );

      // Handle tool calls
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push(assistantMsg);

        for (const toolCall of assistantMsg.tool_calls) {
          const fnName = toolCall.function.name.replace(/^default_api\./, '');

          // Parse and VALIDATE arguments with Zod
          let args: Record<string, any>;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            this.logger.warn(`Invalid JSON from tool call ${fnName}`);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: argumen tidak valid.',
            });
            continue;
          }

          const schema = toolArgSchemas[fnName];
          if (schema) {
            const validation = schema.safeParse(args);
            if (!validation.success) {
              this.logger.warn(
                `Tool ${fnName} validation failed: ${validation.error.message}`,
              );
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Error: parameter tidak valid — ${validation.error.issues.map((iss) => iss.message).join(', ')}`,
              });
              continue;
            }
            args = validation.data as Record<string, any>;
          }

          const result = await this.executeTool(
            fnName,
            args,
            customer,
            conversation,
          );

          this.logger.log(`🔧 Tool called: ${fnName}(${JSON.stringify(args)})`);
          this.logger.log(`🔧 Tool result: ${result.substring(0, 300)}`);

          lastToolResult = result;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        continue;
      }

      // No tool calls — return text response
      const contentText = assistantMsg.content?.trim() ?? '';

      // Gemini may ignore tool_choice=required and return text.
      // On iteration 0, retry once with an explicit instruction to use a tool.
      if (i === 0 && contentText) {
        this.logger.warn(
          `⚠️ LLM ignored tool_choice=required on iteration 0, forcing tool call retry`,
        );
        messages.push(assistantMsg);
        messages.push({
          role: 'user',
          content:
            '[SYSTEM] Kamu HARUS memanggil salah satu tool yang tersedia untuk menjawab. Jika tidak ada aksi yang diperlukan, gunakan tool direct_reply. JANGAN jawab dengan teks langsung.',
        });
        continue;
      }

      if (contentText) {
        this.logger.log(
          `💬 Direct text response (no tool): ${contentText.substring(0, 300)}`,
        );
        return contentText;
      }

      // Empty response
      if (lastToolResult) return lastToolResult;

      if (i < maxIterations - 1) {
        this.logger.warn(`LLM returned empty on iteration ${i}, retrying`);
        continue;
      }
    }

    return (
      lastToolResult ||
      'Maaf, aku mengalami kesulitan memproses permintaan. Coba ulangi ya 🙏'
    );
  }

  // ─── Private: Tool Execution ─────────────────────────

  private async executeTool(
    name: string,
    args: Record<string, any>,
    customer: any,
    conversation: any,
  ): Promise<string> {
    console.log(`Executing tool ${name} with args:`, args);
    try {
      switch (name) {
        case 'get_prayer_times': {
          return this.prayer.getPrayerTimes(args.city);
        }

        case 'set_prayer_reminder': {
          const city = args.city || customer.location;
          if (!city)
            return 'Kamu belum set lokasi. Sebutkan nama kota kamu ya.';
          return this.prayer.setPrayerReminder(
            customer.id,
            city,
            args.prayers ?? ['all'],
            customer.timezone || 'Asia/Jakarta',
          );
        }

        case 'disable_prayer_reminder': {
          return this.prayer.disablePrayerReminder(customer.id);
        }

        case 'get_prayer_reminder_status': {
          return this.prayer.getReminderStatus(customer.id);
        }

        case 'save_memo': {
          let reminderAt: Date | undefined;
          if (args.reminder_time) {
            const tz = customer.timezone || 'Asia/Jakarta';
            const raw = args.reminder_time as string;
            let parsed: dayjs.Dayjs;
            if (/[+-]\d{2}:\d{2}$/.test(raw) || raw.endsWith('Z')) {
              parsed = dayjs(raw);
            } else {
              parsed = dayjs.tz(raw, tz);
            }
            if (parsed.isValid() && parsed.toDate().getTime() > Date.now()) {
              reminderAt = parsed.toDate();
            }
          }

          const memoResult = await this.memo.createMemo(
            customer.id,
            args.content,
            {
              title: args.title,
              reminderAt,
            },
          );

          // If reminder_time is set, also schedule a WhatsApp message so it actually fires
          if (reminderAt) {
            try {
              await this.scheduler.scheduleMessage(
                customer.id,
                args.content,
                reminderAt,
                { timezone: customer.timezone || 'Asia/Jakarta' },
              );
            } catch (err) {
              this.logger.warn(
                `Failed to schedule reminder for memo: ${(err as Error).message}`,
              );
            }
          }

          return memoResult;
        }

        case 'list_memos': {
          return this.memo.listMemos(customer.id);
        }

        case 'get_memo': {
          return this.memo.getMemoByNumber(customer.id, args.memo_number);
        }

        case 'delete_memo': {
          return this.memo.deleteMemo(customer.id, args.memo_number);
        }

        case 'search_memos': {
          return this.memo.searchMemos(customer.id, args.query);
        }

        case 'schedule_message': {
          // Parse the time string — if no timezone offset, treat as user's local time
          const tz = customer.timezone || 'Asia/Jakarta';
          let scheduledAt: Date;
          const raw = args.scheduled_time as string;
          if (/[+-]\d{2}:\d{2}$/.test(raw) || raw.endsWith('Z')) {
            // Has explicit offset — parse directly
            scheduledAt = dayjs(raw).toDate();
          } else {
            // No offset — interpret as user's local timezone
            scheduledAt = dayjs.tz(raw, tz).toDate();
          }
          if (isNaN(scheduledAt.getTime())) {
            return 'Format waktu tidak valid. Gunakan format tanggal yang jelas.';
          }
          if (scheduledAt.getTime() <= Date.now()) {
            return 'Waktu harus di masa depan. Coba sebutkan waktu yang lebih spesifik.';
          }

          // Also save to memos table so reminders are tracked there
          try {
            await this.memo.createMemo(customer.id, args.message, {
              title: args.message.substring(0, 100),
              reminderAt: scheduledAt,
            });
          } catch (err) {
            this.logger.warn(
              `Failed to create memo for scheduled message: ${(err as Error).message}`,
            );
          }

          return this.scheduler.scheduleMessage(
            customer.id,
            args.message,
            scheduledAt,
            {
              targetPhone: args.target_phone,
              targetName: args.target_name,
              repeatInterval: args.repeat_interval,
              timezone: tz,
            },
          );
        }

        case 'list_scheduled_messages': {
          return this.scheduler.listScheduledMessages(customer.id);
        }

        case 'cancel_scheduled_message': {
          return this.scheduler.cancelScheduledMessage(
            customer.id,
            args.schedule_number,
          );
        }

        case 'search_quran': {
          return this.quran.searchQuran(args.query);
        }

        case 'get_ayah': {
          return this.quran.getAyah(args.surah, args.ayah);
        }

        case 'search_knowledge': {
          const results = await this.vectorSearch.searchKnowledge(args.query, {
            topK: 5,
          });

          this.logger.debug(
            `search_knowledge("${args.query}") → ${results.length} results`,
          );

          if (results.length === 0) {
            return `Tidak ditemukan informasi yang relevan untuk "${args.query}". Jawab dengan jujur bahwa kamu tidak punya informasi tersebut, atau coba gunakan search_quran jika ini pertanyaan tentang Al-Quran.`;
          }

          const lines = results.map(
            (r, idx) =>
              `${idx + 1}. [${r.sourceType}] *${r.title}*\n   ${r.content}`,
          );
          return lines.join('\n\n');
        }

        case 'get_daily_quote': {
          return this.quotes.getDailyQuote(args.category);
        }

        case 'escalate_to_admin': {
          const customerName = customer.nickname || customer.name || 'Customer';
          try {
            await this.gowa.sendText(
              PIC_PHONE,
              `⚠️ User ${customerName} (${customer.phoneNumber}) butuh bantuan admin.\nAlasan: ${args.reason}`,
            );
          } catch (err) {
            this.logger.warn(
              `Failed to notify admin: ${(err as Error).message}`,
            );
          }
          return 'Baik, aku sambungkan dengan tim ya. Nanti dibalas secepatnya 🙏';
        }

        case 'direct_reply': {
          return args.message;
        }

        default:
          return `Tool "${name}" tidak dikenali.`;
      }
    } catch (err: any) {
      this.logger.error(`Tool ${name} failed: ${err.message}`);
      return 'Maaf, terjadi kesalahan saat memproses. Coba lagi ya.';
    }
  }
}
