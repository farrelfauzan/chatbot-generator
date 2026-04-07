# MVP Technical Strategy

## Current State Assessment

### What exists

| Layer | Status | Details |
|-------|--------|---------|
| **NestJS API** | Scaffold | Fastify adapter, health endpoint, basic LLM service (`POST /llm/chat`) using OpenAI-compatible client |
| **Prisma Schema** | Partial | `Customer`, `Conversation`, `Message`, `Product`, `Order`, `OrderItem`, `MessageFlow` enum |
| **Dashboard** | Boilerplate | TanStack Start + Tailwind, 2 placeholder routes (home, about) |
| **Shared Types** | Skeleton | `ChatIntent` union, `RecommendationRequest` interface |
| **Monorepo** | Ready | Nx + pnpm workspaces, workspace references wired |

### What is missing for MVP

1. GoWa webhook ingress and outbound message service
2. Conversation orchestration engine (intent → service → reply)
3. Grounded LLM prompt pipeline (context injection, safety rules)
4. Catalog, pricing, recommendation, order, invoice, and payment services
5. Schema additions: `Invoice`, `Payment`, `FaqEntry`, `LlmLog`, product variant support, quote support
6. Dashboard pages: conversations, products, orders, invoices, payments
7. Auth (at least API-key for GoWa webhook, session-based for dashboard)

---

## Architecture Decisions

### AD-1: Service boundary

NestJS is the single brain. GoWa is a dumb transport pipe. The LLM is a language tool, never a decision-maker for transactional data.

### AD-2: Conversation state machine

Each `Conversation` has a `stage` field tracking the customer journey. Transitions are deterministic and driven by NestJS — the LLM can suggest an intent but NestJS validates and moves the state.

```
greeting → discovery → recommendation → pricing → order_confirm → invoiced → payment_pending → paid → fulfilled
```

### AD-3: Intent classification — hybrid

1. First pass: regex/keyword matcher for high-confidence intents (e.g. "catalog", "order", "price").
2. Fallback: LLM classification with constrained enum output.
3. NestJS always maps the final intent to a handler — never raw LLM output.

### AD-4: LLM prompt pattern — retrieval + rules

Every LLM call receives a structured prompt:

```
SYSTEM: You are a sales assistant for {business}. Rules: ...
CONTEXT: { products: [...], stock: {...}, conversation_stage: "...", faq: [...] }
USER: {customer_message}
```

Stock, price, totals are injected as facts. The model explains them, never invents them.

### AD-5: GoWa integration

GoWa exposes REST endpoints. NestJS wraps outbound calls in a `GowaService`. Inbound messages arrive via `POST /webhooks/gowa/messages`. Webhook source is validated by checking a shared secret header.

### AD-6: Dashboard is read-heavy, action-light for MVP

MVP dashboard focuses on: view conversations, manage products/stock, verify payments, update order status. No real-time chat takeover in MVP.

---

## Schema Changes Required

Add to `schema.prisma`:

```prisma
model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  name      String
  sku       String  @unique
  price     Decimal @db.Decimal(12, 2)
  stockQty  Int     @default(0)
  product   Product @relation(fields: [productId], references: [id])
}

model RecommendationSession {
  id                String   @id @default(cuid())
  customerId        String
  conversationId    String
  needSummary       String?
  budget            Decimal? @db.Decimal(12, 2)
  urgency           String?
  preferredCategory String?
  recommendedResult Json?
  createdAt         DateTime @default(now())
}

model Quote {
  id              String   @id @default(cuid())
  customerId      String
  conversationId  String
  subtotal        Decimal  @db.Decimal(12, 2)
  discountAmount  Decimal  @default(0) @db.Decimal(12, 2)
  shippingAmount  Decimal  @default(0) @db.Decimal(12, 2)
  taxAmount       Decimal  @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal  @db.Decimal(12, 2)
  status          String   @default("draft")
  createdAt       DateTime @default(now())
}

model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String   @unique
  orderId       String
  customerId    String
  status        String   @default("issued")
  issuedAt      DateTime @default(now())
  dueAt         DateTime?
  subtotal      Decimal  @db.Decimal(12, 2)
  totalAmount   Decimal  @db.Decimal(12, 2)
  fileUrl       String?
}

model Payment {
  id              String    @id @default(cuid())
  orderId         String
  invoiceId       String?
  customerId      String
  amount          Decimal   @db.Decimal(12, 2)
  paymentMethod   String?
  referenceNumber String?
  proofUrl        String?
  status          String    @default("pending")
  paidAt          DateTime?
  verifiedAt      DateTime?
  verifiedBy      String?
  createdAt       DateTime  @default(now())
}

model FaqEntry {
  id       String  @id @default(cuid())
  question String
  answer   String
  category String?
  isActive Boolean @default(true)
}

model LlmLog {
  id              String   @id @default(cuid())
  conversationId  String?
  messageId       String?
  model           String
  promptSummary   String
  responseSummary String
  createdAt       DateTime @default(now())
}
```

Additions to existing models:
- `Product` → add `variants ProductVariant[]` relation
- `Order` → add `orderNumber String @unique`, `subtotal`, `discountAmount`, `shippingAmount`, `taxAmount` decimal fields, `conversationId`, `quoteId`
- `Conversation` → add `lastInboundAt DateTime?`, `lastOutboundAt DateTime?`, `assignedAdminId String?`
- `Customer` → add `email String?`, `notes String?`
- `Message` → add `rawPayload Json?`, `gatewayMessageId String?`

---

## NestJS Module Plan

Each module = 1 directory under `apps/api/src/` with `*.module.ts`, `*.service.ts`, `*.controller.ts` (controller only if it exposes HTTP).

### Module dependency graph

```
webhooks ──► conversations ──► intent ──► [catalog, faq, recommendation, pricing, order, invoice, payment]
                                              │
                                              ▼
                                             llm
                                              │
                                              ▼
                                            gowa (outbound)
```

### Module breakdown

| Module | Exposes HTTP | Purpose |
|--------|-------------|---------|
| `database` | No | Provides `PrismaService` wrapping the singleton client |
| `gowa` | No | Outbound WhatsApp messaging (send text, image, document) |
| `webhooks` | `POST /webhooks/gowa/messages`, `POST /webhooks/gowa/status` | Inbound GoWa webhook handler |
| `customers` | `GET/POST/PATCH /customers` | CRUD for customer records |
| `conversations` | `GET /conversations` | Conversation state management, stage transitions |
| `messages` | `GET /conversations/:id/messages` | Message storage and retrieval |
| `intent` | No | Intent classification (keyword + LLM fallback) |
| `catalog` | `GET /products`, `POST/PATCH /products` | Product CRUD, search, stock queries |
| `faq` | `GET/POST /faq` | FAQ management and lookup |
| `recommendation` | No | Product recommendation engine (requirement extraction + matching) |
| `pricing` | No | Deterministic price calculation (quantity × price, discounts, shipping, tax) |
| `orders` | `GET/PATCH /orders` | Order lifecycle (draft → confirmed → paid → processing → fulfilled) |
| `invoices` | `GET /invoices` | Invoice generation and retrieval |
| `payments` | `GET/PATCH /payments` | Payment recording and admin verification |
| `llm` | `GET /llm/config` | LLM orchestration (prompt building, completion, logging) |

---

## Conversation Orchestration Engine

This is the core loop. Every inbound message goes through it.

```
┌─────────────────────────────────────────────────────────┐
│  POST /webhooks/gowa/messages                           │
│                                                         │
│  1. Validate webhook (secret header)                    │
│  2. Upsert Customer by phoneNumber                      │
│  3. Find or create active Conversation                  │
│  4. Store inbound Message                               │
│  5. Classify intent (IntentService)                     │
│  6. Route to handler by intent:                         │
│     ┌──────────────────────┬──────────────────────────┐ │
│     │ greeting             │ WelcomeHandler           │ │
│     │ browse_catalog       │ CatalogHandler           │ │
│     │ ask_stock            │ CatalogHandler           │ │
│     │ ask_price            │ PricingHandler           │ │
│     │ ask_product_detail   │ CatalogHandler + LLM     │ │
│     │ ask_recommendation   │ RecommendationHandler    │ │
│     │ calculate_price      │ PricingHandler           │ │
│     │ create_order         │ OrderHandler             │ │
│     │ request_invoice      │ InvoiceHandler           │ │
│     │ confirm_payment      │ PaymentHandler           │ │
│     │ ask_order_status     │ OrderHandler             │ │
│     │ request_human_help   │ EscalationHandler        │ │
│     │ unknown / general_qa │ LLM grounded Q&A        │ │
│     └──────────────────────┴──────────────────────────┘ │
│  7. Handler returns reply text (may call LLM internally)│
│  8. Store outbound Message                              │
│  9. Send via GowaService                                │
│  10. Update Conversation stage + timestamps             │
└─────────────────────────────────────────────────────────┘
```

---

## LLM Prompt Strategy

### System prompt template

```
You are a WhatsApp sales assistant for {{businessName}}.

RULES:
- Answer ONLY using the product data and facts provided below.
- NEVER invent stock quantities, prices, or order statuses.
- If you don't know, say you'll check with the team.
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Use friendly, professional Indonesian or English depending on customer language.
- Format prices with proper thousand separators.

CONVERSATION STAGE: {{stage}}
CUSTOMER: {{customerName}} ({{phoneNumber}})
```

### Context injection per intent

| Intent | Injected context |
|--------|-----------------|
| `browse_catalog` | Active products with name, price, stock (limit 10) |
| `ask_stock` | Specific product stock data |
| `ask_price` | Product price + variant prices |
| `ask_product_detail` | Full product record + FAQ entries for category |
| `ask_recommendation` | All products in matching category with specs |
| `calculate_price` | Cart items with computed subtotal, discount, shipping, tax, total |
| `ask_order_status` | Order record with status, items, payment status |

### Output format

For intent classification, force JSON output:

```json
{
  "intent": "browse_catalog",
  "entities": { "category": "laptop" },
  "confidence": 0.92
}
```

For reply generation, return plain text suitable for WhatsApp.

---

## GoWa Integration

### Inbound webhook payload (expected from GoWa)

```json
{
  "phone": "6281234567890",
  "message": "Mau lihat katalog dong",
  "messageId": "ABC123",
  "timestamp": 1712505600
}
```

### Outbound API call (NestJS → GoWa)

```
POST {GOWA_BASE_URL}/send/message
Content-Type: application/json

{
  "phone": "6281234567890",
  "message": "Berikut katalog kami: ..."
}
```

### Config

```env
GOWA_BASE_URL=http://localhost:3000
GOWA_API_KEY=your-gowa-api-key
GOWA_WEBHOOK_SECRET=your-webhook-secret
```

---

## Dashboard MVP Pages

| Route | Purpose | Key actions |
|-------|---------|-------------|
| `/` | Overview | Stats cards: active conversations, pending orders, unverified payments |
| `/conversations` | Conversation list | View messages, see current stage, see customer info |
| `/conversations/:id` | Conversation detail | Message thread view, customer context sidebar |
| `/products` | Product management | List, create, edit, toggle active, update stock/price |
| `/orders` | Order list | View orders, filter by status, see line items |
| `/orders/:id` | Order detail | Order items, update status |
| `/invoices` | Invoice list | View invoices, see payment status |
| `/payments` | Payment verification | List pending payments, verify/reject, view proof |

### Dashboard API pattern

Dashboard calls NestJS REST endpoints. No separate BFF — use the same NestJS app with a `/api/` prefix for dashboard endpoints and `/webhooks/` prefix for GoWa.

---

## Implementation Phases (ordered by dependency)

### Phase 1 — Data Foundation

**Goal:** Complete schema, database module, seed data.

| # | Task | Output |
|---|------|--------|
| 1.1 | Extend Prisma schema with all missing models and fields | Updated `schema.prisma` |
| 1.2 | Run migration | Migration files |
| 1.3 | Create `DatabaseModule` with `PrismaService` | `apps/api/src/database/` |
| 1.4 | Create seed script with sample products, FAQ entries | `packages/database/prisma/seed.ts` |
| 1.5 | Wire `DatabaseModule` into `AppModule` as global | Updated `app.module.ts` |

### Phase 2 — GoWa Integration Layer

**Goal:** Accept inbound WhatsApp messages, send outbound replies.

| # | Task | Output |
|---|------|--------|
| 2.1 | Create `GowaModule` + `GowaService` (outbound HTTP client) | `apps/api/src/gowa/` |
| 2.2 | Create `WebhooksModule` + `WebhooksController` | `apps/api/src/webhooks/` |
| 2.3 | Implement webhook secret validation guard | `apps/api/src/webhooks/gowa-webhook.guard.ts` |
| 2.4 | Wire inbound message → Customer upsert → Conversation upsert → Message store | Webhook handler |
| 2.5 | Add GoWa config to `app.config.ts` | Updated config |

### Phase 3 — Conversation Engine

**Goal:** Intent classification and routing to handlers.

| # | Task | Output |
|---|------|--------|
| 3.1 | Create `CustomersModule` + `CustomersService` | `apps/api/src/customers/` |
| 3.2 | Create `ConversationsModule` + `ConversationsService` | `apps/api/src/conversations/` |
| 3.3 | Create `MessagesModule` + `MessagesService` | `apps/api/src/messages/` |
| 3.4 | Create `IntentModule` + `IntentService` (keyword matcher + LLM fallback) | `apps/api/src/intent/` |
| 3.5 | Create `ConversationOrchestrator` service — the main routing loop | `apps/api/src/conversations/conversation-orchestrator.service.ts` |
| 3.6 | Implement welcome/greeting handler | Inside orchestrator |

### Phase 4 — Commerce Services

**Goal:** Catalog, pricing, FAQ — the data-driven responses.

| # | Task | Output |
|---|------|--------|
| 4.1 | Create `CatalogModule` + `CatalogService` (product CRUD, search, stock check) | `apps/api/src/catalog/` |
| 4.2 | Create `FaqModule` + `FaqService` | `apps/api/src/faq/` |
| 4.3 | Create `PricingModule` + `PricingService` (deterministic calculation) | `apps/api/src/pricing/` |
| 4.4 | Create `RecommendationModule` + `RecommendationService` | `apps/api/src/recommendation/` |
| 4.5 | Wire catalog/FAQ/pricing/recommendation handlers into orchestrator | Updated orchestrator |

### Phase 5 — Grounded LLM Pipeline

**Goal:** Upgrade LLM service to support context-injected, grounded responses.

| # | Task | Output |
|---|------|--------|
| 5.1 | Refactor `LlmService` to accept structured prompt context | Updated `llm.service.ts` |
| 5.2 | Add `LlmLog` recording to every LLM call | Updated service |
| 5.3 | Implement intent classification prompt (JSON output) | `llm.service.ts` → `classifyIntent()` |
| 5.4 | Implement grounded Q&A prompt (product/FAQ context injection) | `llm.service.ts` → `generateGroundedReply()` |
| 5.5 | Implement recommendation explanation prompt | `llm.service.ts` → `explainRecommendation()` |

### Phase 6 — Transaction Flow

**Goal:** Order creation, invoice generation, payment recording.

| # | Task | Output |
|---|------|--------|
| 6.1 | Create `OrdersModule` + `OrdersService` | `apps/api/src/orders/` |
| 6.2 | Create `InvoicesModule` + `InvoicesService` | `apps/api/src/invoices/` |
| 6.3 | Create `PaymentsModule` + `PaymentsService` | `apps/api/src/payments/` |
| 6.4 | Wire order/invoice/payment handlers into orchestrator | Updated orchestrator |
| 6.5 | Implement order confirmation WhatsApp flow (summarize → confirm → create) | Orchestrator handlers |
| 6.6 | Implement invoice text message generation | Invoice service |

### Phase 7 — Dashboard

**Goal:** Admin can view conversations, manage products, verify payments.

| # | Task | Output |
|---|------|--------|
| 7.1 | Add dashboard REST endpoints to all NestJS modules (list, detail, update) | Controllers |
| 7.2 | Create dashboard overview page (`/`) | Route + components |
| 7.3 | Create products page (list + create/edit) | Route + components |
| 7.4 | Create conversations page (list + detail with messages) | Route + components |
| 7.5 | Create orders page (list + detail + status update) | Route + components |
| 7.6 | Create payments page (list + verify action) | Route + components |
| 7.7 | Create invoices page (list view) | Route + components |

---

## Key Technical Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GoWa webhook format doesn't match expected schema | Broken inbound flow | Build a thin adapter layer; log raw payloads; validate with Zod |
| LLM hallucinating prices/stock | Customer trust | Never pass price/stock generation to LLM; inject as read-only facts |
| LLM latency (2-5s) for every message | Poor UX | Use fast models (flash/mini); cache FAQ answers; skip LLM for deterministic intents |
| Conversation stage desync | Wrong handler triggered | Strict state machine with allowed transitions; log every transition |
| WhatsApp rate limiting | Messages not delivered | Queue outbound messages; implement retry with backoff in GowaService |
| No auth on dashboard | Data exposure | Implement basic session auth or API-key guard before first deploy |

---

## Environment Variables (Complete)

```env
# API
PORT=3001
APP_NAME=chatbot-api

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chatbot

# LLM
LLM_PROVIDER=sumopod
LLM_BASE_URL=https://ai.sumopod.com/v1
LLM_API_KEY=your-key
LLM_MODEL=gemini/gemini-2.5-flash-lite
LLM_MAX_TOKENS=300
LLM_TEMPERATURE=0.7

# GoWa
GOWA_BASE_URL=http://localhost:3000
GOWA_API_KEY=your-gowa-api-key
GOWA_WEBHOOK_SECRET=your-webhook-secret
```

---

## File Structure After MVP

```
apps/api/src/
├── main.ts
├── app.module.ts
├── app.config.ts
├── database/
│   ├── database.module.ts
│   └── prisma.service.ts
├── gowa/
│   ├── gowa.module.ts
│   └── gowa.service.ts
├── webhooks/
│   ├── webhooks.module.ts
│   ├── webhooks.controller.ts
│   └── gowa-webhook.guard.ts
├── customers/
│   ├── customers.module.ts
│   ├── customers.service.ts
│   └── customers.controller.ts
├── conversations/
│   ├── conversations.module.ts
│   ├── conversations.service.ts
│   ├── conversations.controller.ts
│   └── conversation-orchestrator.service.ts
├── messages/
│   ├── messages.module.ts
│   └── messages.service.ts
├── intent/
│   ├── intent.module.ts
│   └── intent.service.ts
├── catalog/
│   ├── catalog.module.ts
│   ├── catalog.service.ts
│   └── catalog.controller.ts
├── faq/
│   ├── faq.module.ts
│   ├── faq.service.ts
│   └── faq.controller.ts
├── recommendation/
│   ├── recommendation.module.ts
│   └── recommendation.service.ts
├── pricing/
│   ├── pricing.module.ts
│   └── pricing.service.ts
├── orders/
│   ├── orders.module.ts
│   ├── orders.service.ts
│   └── orders.controller.ts
├── invoices/
│   ├── invoices.module.ts
│   ├── invoices.service.ts
│   └── invoices.controller.ts
├── payments/
│   ├── payments.module.ts
│   ├── payments.service.ts
│   └── payments.controller.ts
└── llm/
    ├── llm.module.ts
    ├── llm.service.ts
    └── llm.controller.ts

apps/dashboard/src/routes/
├── __root.tsx
├── index.tsx
├── conversations/
│   ├── index.tsx
│   └── $id.tsx
├── products/
│   └── index.tsx
├── orders/
│   ├── index.tsx
│   └── $id.tsx
├── invoices/
│   └── index.tsx
└── payments/
    └── index.tsx
```

---

## Build & Run Order

```bash
# 1. Generate Prisma client after schema changes
pnpm prisma:generate

# 2. Run migration
pnpm prisma:migrate:dev

# 3. Seed database
pnpm --filter @chatbot-generator/database prisma:seed

# 4. Start API
pnpm dev:api

# 5. Start dashboard
pnpm dev:dashboard

# 6. Start GoWa (external — separate process)
# Follow GoWa docs to connect WhatsApp device
```

---

## Definition of Done (MVP)

- [ ] Customer sends "hi" on WhatsApp → receives welcome message
- [ ] Customer asks "show catalog" → receives product list
- [ ] Customer asks "is product X available?" → receives stock answer grounded in real data
- [ ] Customer asks "recommend a laptop for design under 15 juta" → receives recommendation from real catalog
- [ ] Customer asks "how much for 3 pcs of product X?" → receives calculated total
- [ ] Customer says "I want to order" → chatbot confirms items and creates order
- [ ] Customer receives invoice message after order confirmation
- [ ] Customer sends payment confirmation → payment stored as pending
- [ ] Admin opens dashboard → sees conversations, products, orders, payments
- [ ] Admin verifies payment in dashboard → order status updates to paid
- [ ] Customer asks "what's my order status?" → receives current status
