# Wulan AI — MVP Technical Strategy (2-Day Sprint)

**Branch:** `wulan-ai-mvp`  
**Base:** `cardboard-box-chatbot-RAG`  
**Sprint:** 2 days  
**Goal:** Transform existing cardboard box chatbot into Wulan AI — Muslim personal assistant on WhatsApp

---

## Current State Assessment

The existing codebase is a **WhatsApp-based cardboard box sales chatbot** with:
- ✅ WhatsApp gateway (GOWA) with webhook, typing simulation, media sending
- ✅ OpenAI-compatible LLM agent loop with function calling (tool use)
- ✅ RAG pipeline (embedding → pgvector → knowledge search)
- ✅ Redis-backed sessions + BullMQ job queue
- ✅ Customer model (phone-based upsert)
- ✅ Conversation + Message persistence
- ✅ DB-stored prompt templates with variable interpolation
- ✅ Admin dashboard (React + Vite)
- ✅ Prisma + PostgreSQL + pgvector

**What needs to go:** E-commerce tools (cart, orders, pricing, DOKU payment), cardboard-specific knowledge, Mader Packer branding, sales-funnel stages.

**What needs to be added:** Prayer time engine, reminder/scheduler system, memo storage, Quran/Hadith knowledge base, daily quotes, Google Calendar integration, Wulan Soul system + tools.

---

## Soul System Architecture

Inspired by how advanced AI agents maintain identity, Wulan uses a **layered soul system** that ensures the bot always knows who it is, what it can do, and what the user's persistent state looks like.

```
┌─────────────────────────────────────────┐
│  Layer 1: SOUL (immutable identity)     │  ← Who am I?
│  - Persona, name, communication style   │
│  - Hard rules / boundaries              │
│  - Personality traits                   │
├─────────────────────────────────────────┤
│  Layer 2: ABILITIES (feature config)    │  ← What can I do?
│  - Available tools/features             │
│  - Feature-specific instructions        │
│  - /help command reference              │
├─────────────────────────────────────────┤
│  Layer 3: USER CONTEXT (from DB)        │  ← What do I know about this user?
│  - Nickname, location, timezone         │
│  - Active memos & reminders (full list) │
│  - Prayer reminder config               │
│  - Scheduled messages                   │
├─────────────────────────────────────────┤
│  Layer 4: CONVERSATION (ephemeral)      │  ← What's happening right now?
│  - Message history (last 20)            │
│  - Prior conversation context           │
└─────────────────────────────────────────┘
```

**How it works:**
- **Layer 1 (Soul)** is stored in `wulan-soul.md` — version-controlled, read on startup, cached in memory. This is the bot's immutable identity.
- **Layer 2 (Abilities)** is built from the registered tool definitions + feature flags.
- **Layer 3 (User Context)** is queried from PostgreSQL on every conversation turn — the user's memos, reminders, prayer settings, schedules are injected into the system prompt so the LLM always has full awareness (e.g., "User already has a 5am alarm" → LLM can say "You already have that reminder").
- **Layer 4 (Conversation)** is the ephemeral message history from the current + prior sessions.

All four layers are assembled into the final system prompt on every LLM call. The bot never forgets who it is or what the user has already set up.

**Soul file location:** `apps/api/src/soul/wulan-soul.md`

### Why DB, not Redis, for persistent user state

Redis is session-scoped (30-min TTL). When a session expires, Redis data is lost. Memos and reminders are **permanent, cross-session state** — they must survive across days, weeks, months. PostgreSQL via Prisma is the right choice:
- Persistent and durable
- Queryable (search memos by content, filter reminders by time)
- Relational (tied to Customer)
- Injected into Layer 3 on every turn so the LLM has full context

**Redis stays only for:** session tracking, message dedup locks, phone-level locks, BullMQ job queues.

---

## Feature Breakdown & Priority

| # | Feature | Complexity | Priority | Day |
|---|---------|-----------|----------|-----|
| 1 | **Pengingat Shalat** — Prayer time reminder by location | High | P0 | Day 1 |
| 2 | **Memo Cerdas** — Smart notes ("Catat...") | Medium | P0 | Day 1 |
| 3 | **WhatsApp Scheduler** — Schedule messages to contacts | High | P1 | Day 2 |
| 4 | **Wawasan Islami** — Quran, Tafsir, Hadith search | Medium | P0 | Day 1 |
| 5 | **Quotes Harian** — Daily motivational quotes | Low | P1 | Day 2 |
| 6 | **Integrasi Google Calendar** — Manage events via chat | High | P2 | Day 2 |

---

## Architecture Plan

### Day 1: Core Foundation + Features 1, 2, 4

#### 1. Strip E-Commerce Code & Rebrand

**Files to modify:**
- `conversation-orchestrator.service.ts` — Remove all 14 cardboard tools, replace with Wulan tools
- `app.module.ts` — Remove/keep modules as needed (remove: DokuModule, OrdersModule, CatalogImagesModule; keep everything else)
- `chat-session.service.ts` — Remove cart system (memos/reminders live in DB, not Redis)
- `intent.service.ts` — Replace e-commerce intents with Wulan intents

**Files/modules to remove or ignore:**
- `cardboard/pricing.ts`
- `doku/` (payment gateway)
- `orders/` (order management)
- `catalog-images/` (product catalog)
- `catalog/` (product catalog)
- `categories/` (product categories)

**Keep as-is:**
- `gowa/` (WhatsApp gateway)
- `llm/` (LLM service)
- `embedding/` (vector embeddings)
- `vector-search/` (pgvector search)
- `faq/` (will repurpose for Islamic Q&A)
- `ingestion/` (knowledge indexing)
- `prompt-templates/` (prompt management)
- `redis/` (Redis client)
- `s3/` (file storage — for future use)
- `webhooks/` (WhatsApp webhook)
- `customers/` (customer model)
- `conversations/` (conversation management)
- `messages/` (message history)
- `chat-session/` (session management)
- `settings/` (settings store)
- `auth/` (admin auth)

#### 2. Database Schema Changes

**New models to add in `schema.prisma`:**

```prisma
model Memo {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  content      String   // The actual note/memo text
  title        String?  // Optional short title
  tags         String[] // Tags for organization
  reminderAt   DateTime? // Optional: when to remind about this memo
  reminded     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("memos")
}

model PrayerReminder {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  location     String   // City/district name
  latitude     Float?
  longitude    Float?
  timezone     String   @default("Asia/Jakarta")
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([customerId])
  @@map("prayer_reminders")
}

model ScheduledMessage {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  targetPhone  String   // Recipient phone number
  targetName   String?  // Recipient name (optional)
  content      String   // Message to send
  scheduledAt  DateTime // When to send
  sentAt       DateTime? // Null if not yet sent
  status       String   @default("pending") // pending, sent, failed, cancelled
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("scheduled_messages")
}

model DailyQuote {
  id        String   @id @default(cuid())
  content   String   // Quote text
  source    String?  // Source (Quran, Hadith, Scholar, etc.)
  category  String   @default("islamic") // islamic, motivational, productivity
  createdAt DateTime @default(now())

  @@map("daily_quotes")
}
```

**Modify existing:**
- Add `location`, `nickname` fields to `Customer` model
- Add relation to `Memo`, `PrayerReminder`, `ScheduledMessage` on `Customer`
- Simplify `Conversation` stages (remove e-commerce stages)

#### 3. New Modules to Create

##### 3a. `prayer/` — Prayer Time Module
- **prayer.module.ts** — NestJS module
- **prayer.service.ts** — Core logic:
  - Fetch prayer times from **Aladhan API** (`https://api.aladhan.com/v1/timingsByCity`) — free, no API key
  - Store user location in `PrayerReminder` table
  - Calculate next prayer time for a given location
  - Format prayer schedule as WhatsApp-friendly text
- **prayer-cron.service.ts** — BullMQ recurring job:
  - Every minute: check all active prayer reminders
  - For each: calculate if any prayer time is within the next 1-2 minutes
  - If yes: send WhatsApp reminder via GowaService
  - Track sent reminders in Redis to avoid duplicates (key: `prayer:sent:{customerId}:{prayer}:{date}`)

##### 3b. `memo/` — Smart Memo Module
- **memo.module.ts**
- **memo.service.ts** — CRUD:
  - `createMemo(customerId, content, reminderAt?)` — save memo
  - `listMemos(customerId)` — list all active memos
  - `getMemo(id)` — get single memo
  - `deleteMemo(id)` — delete memo
  - `searchMemos(customerId, query)` — basic text search
- **memo-reminder.processor.ts** — BullMQ job:
  - Check memos with `reminderAt` approaching
  - Send WhatsApp reminder with memo content

##### 3c. `scheduler/` — Message Scheduler Module
- **scheduler.module.ts**
- **scheduler.service.ts**:
  - `scheduleMessage(customerId, targetPhone, content, scheduledAt)` — create scheduled message
  - `cancelScheduledMessage(id)` — cancel pending message
  - `listScheduledMessages(customerId)` — list user's scheduled messages
- **scheduler.processor.ts** — BullMQ processor:
  - Poll every minute for messages due
  - Send via GowaService to target phone
  - Update status to `sent`
  
> **Note:** WhatsApp API typically only allows sending to numbers that have interacted with the business number. This means the "schedule message to any contact" may be limited. We'll implement it anyway and handle errors gracefully. Alternatively, we send the scheduled message back to the user's own WhatsApp as a reminder.

##### 3d. `quran/` — Islamic Knowledge Module
- **quran.module.ts**
- **quran.service.ts**:
  - Integration with **Al-Quran Cloud API** (`https://api.alquran.cloud/v1/`) — free
  - `getSurah(number)` — get surah info + text
  - `getAyah(surah, ayah)` — get specific verse (Arabic + Indonesian translation)
  - `searchQuran(query)` — search Quran by keyword
  - Hadith search via **sunnah.com API** or pre-seeded knowledge chunks
  
> The RAG pipeline (vector search) will also be seeded with Islamic knowledge for more natural Q&A.

##### 3e. `quotes/` — Daily Quotes Module
- **quotes.module.ts**
- **quotes.service.ts**:
  - `getRandomQuote(category?)` — fetch random quote from DB
  - `getDailyQuote(customerId)` — get today's quote (consistent per user per day)
- **quotes-cron.service.ts** — BullMQ scheduled job:
  - Daily at configurable time (e.g., 06:00 WIB)
  - Send daily quote to all active customers via WhatsApp

#### 4. New Orchestrator Tools (Function Calling)

Replace the 14 cardboard tools with these Wulan-specific tools:

```typescript
const WULAN_TOOLS: OpenAI.ChatCompletionTool[] = [
  // === PRAYER ===
  {
    name: 'get_prayer_times',
    description: 'Get today\'s prayer times for a location. Use when user asks about prayer schedule or shalat times.',
    parameters: {
      city: { type: 'string', description: 'City name (e.g., "Jakarta", "Malang", "Lawang Malang")' },
      country: { type: 'string', description: 'Country name. Default: "Indonesia"' }
    },
    required: ['city']
  },
  {
    name: 'set_prayer_reminder',
    description: 'Enable/update automatic prayer time reminders for the user based on their location.',
    parameters: {
      city: { type: 'string', description: 'City name for prayer time calculation' },
      enabled: { type: 'boolean', description: 'Enable or disable prayer reminders. Default: true' }
    },
    required: ['city']
  },

  // === MEMO ===
  {
    name: 'save_memo',
    description: 'Save a note/memo for the user. Use when user says "catat", "simpan", "ingat", "note", or asks to remember something.',
    parameters: {
      content: { type: 'string', description: 'The full memo content. Preserve all details, do NOT summarize.' },
      title: { type: 'string', description: 'Short title for the memo (optional)' },
      reminder_time: { type: 'string', description: 'ISO datetime to remind about this memo (optional)' }
    },
    required: ['content']
  },
  {
    name: 'list_memos',
    description: 'List all saved memos/notes for the user. Use when user asks to see their notes or memos.',
    parameters: {}
  },
  {
    name: 'delete_memo',
    description: 'Delete a specific memo by its number.',
    parameters: {
      memo_number: { type: 'number', description: 'The memo number to delete (1-based)' }
    },
    required: ['memo_number']
  },

  // === SCHEDULER ===
  {
    name: 'schedule_message',
    description: 'Schedule a WhatsApp message to be sent at a specific time. Can be a reminder to self or message to a contact.',
    parameters: {
      message: { type: 'string', description: 'Message content to send' },
      scheduled_time: { type: 'string', description: 'ISO datetime when to send the message' },
      target_phone: { type: 'string', description: 'Target phone number (optional, defaults to user\'s own number)' },
      target_name: { type: 'string', description: 'Name of the recipient (optional)' }
    },
    required: ['message', 'scheduled_time']
  },
  {
    name: 'list_scheduled_messages',
    description: 'List all pending scheduled messages for the user.',
    parameters: {}
  },
  {
    name: 'cancel_scheduled_message',
    description: 'Cancel a pending scheduled message.',
    parameters: {
      schedule_number: { type: 'number', description: 'The schedule number to cancel (1-based)' }
    },
    required: ['schedule_number']
  },

  // === ISLAMIC KNOWLEDGE ===
  {
    name: 'search_quran',
    description: 'Search the Quran by keyword, surah name, or ayah reference. Use for tafsir, meaning, or surah info.',
    parameters: {
      query: { type: 'string', description: 'Search query — surah name, keyword, or reference (e.g., "Al-Fatihah", "sabar", "2:255")' }
    },
    required: ['query']
  },
  {
    name: 'get_ayah',
    description: 'Get a specific Quran verse with Arabic text and Indonesian translation.',
    parameters: {
      surah: { type: 'number', description: 'Surah number (1-114)' },
      ayah: { type: 'number', description: 'Ayah/verse number' }
    },
    required: ['surah', 'ayah']
  },
  {
    name: 'search_knowledge',
    description: 'Search the knowledge base for Islamic information, hadith, daily practices, dua, and general questions. Use this as primary source of truth.',
    parameters: {
      query: { type: 'string', description: 'Search query in Indonesian or Arabic' }
    },
    required: ['query']
  },

  // === QUOTES ===
  {
    name: 'get_daily_quote',
    description: 'Get today\'s motivational/Islamic quote. Use when user asks for quote, motivation, or inspiration.',
    parameters: {
      category: { type: 'string', enum: ['islamic', 'motivational', 'productivity'], description: 'Quote category. Default: islamic' }
    }
  },

  // === GOOGLE CALENDAR ===
  {
    name: 'create_calendar_event',
    description: 'Create an event in the user\'s Google Calendar.',
    parameters: {
      title: { type: 'string', description: 'Event title' },
      start_time: { type: 'string', description: 'Event start time (ISO datetime)' },
      end_time: { type: 'string', description: 'Event end time (ISO datetime, optional)' },
      description: { type: 'string', description: 'Event description (optional)' }
    },
    required: ['title', 'start_time']
  },
  {
    name: 'list_calendar_events',
    description: 'List upcoming events from user\'s Google Calendar.',
    parameters: {
      days: { type: 'number', description: 'Number of days to look ahead. Default: 7' }
    }
  },

  // === GENERAL ===
  {
    name: 'escalate_to_admin',
    description: 'Connect user to a human admin when they need help beyond AI capabilities.',
    parameters: {
      reason: { type: 'string', description: 'Reason for escalation' }
    },
    required: ['reason']
  }
];
```

#### 5. Soul System Implementation

Instead of a single prompt template, Wulan uses the **layered soul system** described above.

**File: `apps/api/src/soul/wulan-soul.md`** — The immutable identity:

```markdown
# Wulan — Soul

## Identitas
Nama: Wulan
Peran: Asisten pribadi Muslim berbasis AI di WhatsApp
Bahasa: Indonesia sehari-hari (casual tapi sopan)

## Kepribadian
- Ramah, hangat, dan sopan — seperti teman dekat yang perhatian
- Sesingkat mungkin, tanpa basa-basi berlebihan
- Gunakan emoji secukupnya (1-2 per pesan, tidak berlebihan)
- Selalu panggil user dengan nama panggilan mereka
- Tunjukkan empati dan perhatian yang tulus

## Batasan (TIDAK BOLEH dilanggar)
- JANGAN pernah membahas hal teknis/sistem internal Wulan
- JANGAN menjawab hal yang tidak berhubungan dengan permintaan user
- JANGAN mengarang jawaban islami — SELALU cari dari knowledge base terlebih dahulu
- JANGAN meringkas memo/catatan user — simpan LENGKAP seperti yang diminta
- JANGAN memberikan fatwa — arahkan ke ustadz/ulama untuk hal sensitif
- JANGAN membahas topik politik, SARA, atau kontroversi

## Gaya Komunikasi
- Respons singkat dan to-the-point
- Gunakan format list/bullet untuk info terstruktur (jadwal shalat, daftar memo)
- Konfirmasi tindakan dengan jelas ("Sudah dicatat ✅", "Pengingat aktif ✅")
- Jika tidak yakin, tanya balik daripada menebak
```

**File: `apps/api/src/soul/wulan-abilities.md`** — Feature instructions:

```markdown
# Wulan — Abilities

## Fitur Aktif
1. **Pengingat Shalat** — Atur pengingat shalat 5 waktu berdasarkan lokasi
2. **Memo Cerdas** — Catat dan simpan apapun ("Catat...", "Simpan...", "Ingat...")
3. **Jadwal Pesan** — Jadwalkan pesan WhatsApp untuk dikirim nanti
4. **Wawasan Islami** — Jawab pertanyaan tentang Quran, tafsir, hadits
5. **Quotes Harian** — Kirim motivasi harian
6. **Google Calendar** — Kelola event calendar lewat chat

## Instruksi per Fitur

### Pengingat Shalat
- Saat user sebut lokasi, gunakan `set_prayer_reminder` untuk aktifkan pengingat otomatis
- Gunakan `get_prayer_times` untuk tampilkan jadwal hari ini
- Jika user pindah lokasi, update otomatis

### Memo Cerdas
- Trigger: "catat", "simpan", "ingat", "note", "tulis"
- Gunakan `save_memo` — simpan LENGKAP, JANGAN summary
- Jika user minta lihat catatan → `list_memos`
- Jika user minta hapus → `delete_memo`
- PENTING: Selalu cek USER CONTEXT dulu — jika memo serupa sudah ada, tanyakan apakah mau update atau buat baru

### Jadwal Pesan
- Gunakan `schedule_message` untuk jadwalkan pesan
- Default target: nomor user sendiri (sebagai reminder)
- Selalu konfirmasi waktu dan isi pesan sebelum menjadwalkan

### Wawasan Islami
- SELALU gunakan `search_knowledge` atau `search_quran` terlebih dahulu
- Jangan mengarang — jika tidak ditemukan, katakan dengan jujur
- Sertakan referensi (nama surah, nomor ayat, nama kitab hadits)

### Quotes Harian
- Gunakan `get_daily_quote` saat user minta motivasi/quote
- Quotes otomatis dikirim setiap pagi (jika user subscribe)

### Google Calendar
- Gunakan `create_calendar_event` dan `list_calendar_events`
- Selalu konfirmasi detail event sebelum membuat

## Daftar Fitur (untuk /help)
✅ Pengingat Shalat: Otomatis sesuai lokasi Anda.
✅ Memo Cerdas: Simpan ide atau tugas dengan perintah "Catat...".
✅ WhatsApp Scheduler: Jadwalkan pesan ke kontak mana pun.
✅ Wawasan Islami: Tanya tafsir, info surah, atau hadits.
✅ Quotes Harian: Motivasi harian untuk Anda.
✅ Integrasi Google Calendar: Kelola event lewat chat.

Ketik /help untuk bantuan umum.
```

**Orchestrator assembly** (in `buildChatMessages`):

```typescript
// Layer 1: Soul (cached from file)
const soul = this.soulService.getSoul();         // wulan-soul.md content
const abilities = this.soulService.getAbilities(); // wulan-abilities.md content

// Layer 3: User Context (queried from DB every turn)
const userContext = await this.soulService.buildUserContext(customer, phone);
// Returns: nickname, location, active memos, prayer config, scheduled messages

// Assemble system prompt
const systemPrompt = [
  soul,
  abilities,
  userContext,  // "USER STATE:\n- Memos: [list]\n- Reminders: [list]\n- Prayer: Malang, active"
].join('\n\n---\n\n');
```

This means the LLM **always** sees the user's full persistent state, enabling responses like "You already have a 5am reminder — want to change it?" without any special logic.

#### 6. Knowledge Base Seeding

Create seed script to populate `KnowledgeChunk` and `FaqEntry` tables with:

1. **Islamic Q&A** — Common questions about shalat, wudhu, doa sehari-hari, puasa, zakat
2. **Quran metadata** — 114 surah names, meanings, number of ayahs, revelation location
3. **Basic Hadith** — Popular hadits from Bukhari & Muslim (general wisdom, daily practices)
4. **Doa sehari-hari** — Common daily du'a (before eating, entering mosque, traveling, etc.)
5. **Wulan FAQ** — How to use Wulan, commands, pricing info

---

### Day 2: Features 3, 5, 6 + Polish

#### 7. WhatsApp Scheduler (Feature 3)
- Implement `scheduler/` module
- BullMQ processor for sending scheduled messages
- Handle timezone correctly (WIB/WITA/WIT based on user location)

#### 8. Daily Quotes (Feature 5)
- Seed database with 100+ Islamic & motivational quotes
- BullMQ daily cron to send quotes to subscribed users
- Tool handler for on-demand quote requests

#### 9. Google Calendar Integration (Feature 6)
- OAuth2 flow: User connects Google account via a link sent through WhatsApp
- Store refresh token in Customer record (encrypted)
- Create/list events via Google Calendar API
- **Fallback if no time for full OAuth:** Store events locally in a new `CalendarEvent` model and sync later

> **Realistic assessment:** Full Google Calendar OAuth in 2 days is ambitious. Plan B: implement a local calendar/event system that stores events in DB and reminds via WhatsApp, then add Google Calendar sync as a fast-follow.

#### 10. Dashboard Adaptation
- Remove e-commerce routes (orders, products, categories)
- Add memo management view
- Add prayer reminder management
- Add scheduled messages view
- Update overview stats (customers, memos, reminders, scheduled messages)

#### 11. Onboarding Flow
When a new customer first messages Wulan:
1. Greet with Wulan persona
2. Ask for nickname
3. Ask for location (for prayer times)
4. Automatically set up prayer reminders
5. Send feature list (/help)

#### 12. `/help` Command Handler
Intercept `/help` command before the agent loop and return the feature list directly (no LLM call needed).

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Prayer Time API | Aladhan API (free) | No API key needed, supports Indonesian cities, well-documented |
| Quran API | Al-Quran Cloud API (free) | Arabic + Indonesian translation, search capability |
| Scheduler | BullMQ (existing) | Already in the stack, supports delayed/recurring jobs |
| Knowledge Base | pgvector RAG (existing) | Reuse existing embedding + vector search pipeline |
| Google Calendar | Google Calendar API v3 | Standard, well-documented. Needs OAuth2. |
| LLM | Keep current (Gemini Flash via proxy) | Fast and cheap, good for Indonesian language |
| Timezone | Default WIB, configurable per user | Most Indonesian Muslims are in WIB zone |

---

## Database Migration Plan

```
1. Add new models: Memo, PrayerReminder, ScheduledMessage, DailyQuote
2. Add fields to Customer: nickname, location, timezone
3. Simplify Conversation stages (remove e-commerce stages)
4. Keep existing tables (Customer, Conversation, Message, KnowledgeChunk, FaqEntry, etc.)
5. Remove/deprecate: Order, OrderItem, CatalogImage (leave tables but remove module code)
```

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prayer time accuracy | High — wrong times = trust lost | Use Aladhan API (official calculation methods), allow user to verify & adjust |
| Google Calendar OAuth complexity | Medium — might not finish in 2 days | Plan B: local event storage + WhatsApp reminders without Google sync |
| WhatsApp message to contacts | Medium — API may not support sending to non-interacted numbers | Default to sending reminders back to user's own number |
| LLM response time > 20s | Medium — MVP spec says <20s | Use Gemini Flash (fast), keep prompts concise, cache prayer times |
| Knowledge base quality | High — wrong Islamic info is worse than no info | Verify sources, add disclaimers, always cite Quran/Hadith references |

---

## Implementation Order (Hour by Hour)

### Day 1 (~10 hours)

| Hour | Task |
|------|------|
| 0-1 | Schema migration: new models, modify Customer, simplify Conversation |
| 1-3 | Strip e-commerce code from orchestrator, create new tool definitions |
| 3-4 | Create `prayer/` module — Aladhan API integration + get_prayer_times tool |
| 4-5 | Create `prayer-cron.service.ts` — BullMQ prayer reminder cron |
| 5-6 | Create `memo/` module — CRUD + save_memo/list_memos/delete_memo tools |
| 6-7 | Create `quran/` module — Al-Quran Cloud API + search_quran/get_ayah tools |
| 7-8 | Create soul system (`soul/` module) + `wulan-soul.md` + `wulan-abilities.md` |
| 8-9 | Seed Islamic knowledge base (KnowledgeChunk) |
| 9-10 | Onboarding flow + /help command + end-to-end testing |

### Day 2 (~10 hours)

| Hour | Task |
|------|------|
| 0-2 | Create `scheduler/` module — schedule_message/list/cancel tools + BullMQ processor |
| 2-3 | Create `quotes/` module — seed quotes + daily cron + get_daily_quote tool |
| 3-5 | Google Calendar integration (or local fallback) |
| 5-6 | Intent service update — new Wulan intents (not strictly needed if orchestrator handles all) |
| 6-8 | Dashboard adaptation — remove e-commerce, add Wulan views |
| 8-9 | Bug fixes, edge cases, error handling |
| 9-10 | Full end-to-end testing on WhatsApp |

---

## Acceptance Criteria (Definition of Done)

- [ ] User can message Wulan on WhatsApp and get a personalized greeting
- [ ] User can set location and receive prayer time schedule
- [ ] Prayer reminders are automatically sent at correct times
- [ ] User can save memos with "Catat..." command (stored FULLY, not summarized)
- [ ] User can list and delete memos
- [ ] User can schedule messages for future delivery
- [ ] User can ask about Quran surah/ayah and get accurate answers
- [ ] User can request daily quotes
- [ ] User can create/list Google Calendar events (or local alternative)
- [ ] `/help` command returns feature list
- [ ] All responses are < 20 seconds
- [ ] Wulan persona is consistent (friendly, concise, Indonesian)
- [ ] No e-commerce/cardboard references remain

---

## Files Changed Summary

### New Files
```
apps/api/src/soul/soul.module.ts
apps/api/src/soul/soul.service.ts
apps/api/src/soul/wulan-soul.md
apps/api/src/soul/wulan-abilities.md
apps/api/src/prayer/prayer.module.ts
apps/api/src/prayer/prayer.service.ts
apps/api/src/prayer/prayer-cron.service.ts
apps/api/src/memo/memo.module.ts
apps/api/src/memo/memo.service.ts
apps/api/src/memo/memo-reminder.processor.ts
apps/api/src/quran/quran.module.ts
apps/api/src/quran/quran.service.ts
apps/api/src/scheduler/scheduler.module.ts
apps/api/src/scheduler/scheduler.service.ts
apps/api/src/scheduler/scheduler.processor.ts
apps/api/src/quotes/quotes.module.ts
apps/api/src/quotes/quotes.service.ts
apps/api/src/quotes/quotes-cron.service.ts
packages/database/prisma/migrations/xxx_wulan_ai_models/migration.sql
packages/database/prisma/seed-wulan.ts  (Islamic knowledge seed)
```

### Modified Files
```
packages/database/prisma/schema.prisma — New models + Customer fields
apps/api/src/app.module.ts — Swap modules
apps/api/src/conversations/conversation-orchestrator.service.ts — New tools + persona
apps/api/src/chat-session/chat-session.service.ts — Remove cart (persistent state lives in DB now)
apps/api/src/customers/customers.service.ts — nickname/location fields
packages/shared-types/src/enums.ts — New intents/stages
apps/dashboard/src/routes/ — Remove e-commerce, add Wulan views
```

### Removed/Deprecated (code only, keep DB tables for safety)
```
apps/api/src/cardboard/ — Pricing module (unused)
apps/api/src/doku/ — Payment gateway (unused)
apps/api/src/orders/ — Order management (unused)
apps/api/src/catalog-images/ — Product images (unused)
apps/api/src/catalog/ — Product catalog (unused)
apps/api/src/categories/ — Product categories (unused)
```
