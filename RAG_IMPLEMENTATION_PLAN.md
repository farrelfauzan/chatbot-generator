# RAG Implementation Plan — Cardboard Box Chatbot

> Branch: `cardboard-box-chatbot-RAG`
> Created: 2026-04-19

---

## 1. Overview

Add Retrieval-Augmented Generation (RAG) to the WhatsApp chatbot so it can
answer customer questions using **semantic search** instead of keyword matching.

**Current state:**
- FAQ retrieval → loads all entries, filters with `String.includes()`
- Catalog search → Prisma `contains` (SQL `LIKE`) — **not even exposed as an agent tool**
- Recommendation → loads ALL products, sorts by price/stock
- No embeddings, no vector columns, no pgvector

**Target state:**
- Unified `KnowledgeChunk` table as the **knowledge base** for all searchable content
- Embed FAQ, pricing rules, and bot behaviour at write time
- At query time, embed the user's message → cosine similarity search via pgvector
- Top-K results injected into prompt context
- New `search_knowledge` tool wired into the orchestrator agent loop

**Knowledge base source types:**
| Source Type   | What It Contains                                                        |
| ------------- | ----------------------------------------------------------------------- |
| `faq`         | FAQ question/answer pairs (synced from `FaqEntry` table)                |
| `pricing`     | Pricing calculation rules — box types, material rates, sablon costs, minimums, rounding logic |
| `bot_behavior`| Bot personality, conversation rules, stage flows, formatting, scope boundaries |
| `policy`      | Business policies — delivery, location, payment, cancellation           |
| `custom`      | Any other knowledge added manually                                      |

---

## 2. Schema Cleanup (Pre-RAG)

The following models are **inactive / not relevant** for the current chatbot
flow and will be **removed** to keep the schema lean before adding RAG columns:

| Model              | Reason for Removal                                                       |
| ------------------ | ------------------------------------------------------------------------ |
| `BankAccount`      | Dashboard-only feature, not used by chatbot or any active service        |
| `CardboardProduct` | Pricing is formula-based (`pricing.ts`), not DB-driven. Products are computed, not stored. `OrderItem` stores custom specs inline. |
| `Quote`            | No service references it; orders are created directly from cart          |
| `SablonOption`     | Sablon pricing is hardcoded in the pricing formula, not queried from DB  |
| `Invoice`          | Dashboard billing feature — no chatbot or API usage                     |
| `Payment`          | Dashboard billing feature — no chatbot or API usage                     |
| `RecommendationSession` | Recommendation service exists but is **not wired** into the orchestrator tools. Will be rebuilt with RAG. |

**Models that stay:**

| Model            | Why                                                                      |
| ---------------- | ------------------------------------------------------------------------ |
| `Admin`          | Auth for dashboard (future use)                                          |
| `CompanyInfo`    | Key-value config used by the bot                                         |
| `Customer`       | Core — linked to conversations and orders                                |
| `Conversation`   | Core — chat session tracking                                             |
| `Message`        | Core — message history for agent loop context                            |
| `CatalogImage`   | Used by `send_catalog_images` / `send_sablon_samples` tools              |
| `Order`          | Core — order lifecycle                                                   |
| `OrderItem`      | Core — stores custom box specs inline (no FK to CardboardProduct needed) |
| `FaqEntry`       | Core — will get an `embedding` column for RAG                            |
| `LlmLog`         | Audit trail for LLM calls                                                |
| `PromptTemplate` | Prompt management system                                                 |
| `BotConfig`      | Runtime bot configuration                                                |
| `MessageFlow`    | Enum used by `Message`                                                   |

---

## 3. New Schema Additions (RAG)

### 3.1 Enable pgvector extension

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [vector]
}
```

### 3.2 New model: `KnowledgeChunk`

A unified knowledge base table for all RAG-searchable content (FAQ, pricing
rules, bot behaviour, policies, etc.):

```prisma
model KnowledgeChunk {
  id         String   @id @default(cuid())
  sourceType String                           // "faq" | "pricing" | "bot_behavior" | "policy" | "custom"
  sourceId   String?                          // FK to original record if applicable
  title      String
  content    String                           // The text chunk
  metadata   Json?                            // Extra structured data (category, price, etc.)
  embedding  Unsupported("vector(1536)")?     // OpenAI text-embedding-3-small dimension
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([sourceType])
}
```

### 3.3 Add `embedding` column to `FaqEntry`

```prisma
model FaqEntry {
  id        String                          @id @default(cuid())
  question  String
  answer    String
  category  String?
  isActive  Boolean                         @default(true)
  embedding Unsupported("vector(1536)")?
}
```

---

## 4. Infrastructure Changes

### 4.1 Docker — pgvector image

```yaml
# docker-compose.yml
postgres:
  image: pgvector/pgvector:pg16   # replaces plain postgres:16
```

### 4.2 Dependencies

```
# Already installed — no new package needed for embeddings:
openai ^4.104.0   → client.embeddings.create()

# No LangChain, no external vector DB
```

---

## 5. New Services & Modules

### 5.1 `EmbeddingService` (new)

**Location:** `apps/api/src/embedding/embedding.service.ts`

Responsibilities:
- `embedText(text: string): Promise<number[]>` — single text → embedding
- `embedBatch(texts: string[]): Promise<number[][]>` — batch (up to 2048 inputs)
- Uses the same OpenAI client with `text-embedding-3-small` model
- Caches nothing — embeddings are stored in DB at write time

### 5.2 `VectorSearchService` (new)

**Location:** `apps/api/src/vector-search/vector-search.service.ts`

Responsibilities:
- `searchFaq(query: string, topK?: number): Promise<FaqEntry[]>`
- `searchKnowledge(query: string, sourceType?: string, topK?: number): Promise<KnowledgeChunk[]>`
- Calls `EmbeddingService.embedText()` on the query
- Executes raw SQL with pgvector `<=>` operator (cosine distance)
- Returns results with similarity score

Example query:
```sql
SELECT id, question, answer, category,
       1 - (embedding <=> $1::vector) AS similarity
FROM "FaqEntry"
WHERE "isActive" = true AND embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT $2
```

### 5.3 `IngestionService` (new)

**Location:** `apps/api/src/ingestion/ingestion.service.ts`

Responsibilities:
- `ingestAllFaq()` — reads all FAQ entries, generates embeddings, stores them
- `ingestFaqEntry(id: string)` — single entry (called on create/update)
- `ingestKnowledgeChunk(chunk)` — embed and store a knowledge chunk
- `reindexAll()` — full re-embedding (admin endpoint or CLI script)

---

## 6. Changes to Existing Services

### 6.1 FAQ Service (`faq.service.ts`)

**Before:** `get_faq` tool → `listActive()` → JS `.filter()` with `.includes()`
**After:** `get_faq` tool → `VectorSearchService.searchFaq(topic)` → top-5 semantic matches

Fallback: if no embeddings exist yet, fall back to current keyword matching.

### 6.2 Conversation Orchestrator (`conversation-orchestrator.service.ts`)

**New tool added to agent loop:**

```typescript
{
  type: 'function',
  function: {
    name: 'search_knowledge',
    description: 'Search the knowledge base for product info, policies, or any business information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        source_type: { type: 'string', enum: ['faq', 'pricing', 'bot_behavior', 'policy', 'all'], description: 'Filter by source type' },
      },
      required: ['query'],
    },
  },
}
```

The `get_faq` tool is updated to use vector search internally.

### 6.3 LLM Service (`llm.service.ts`)

Add method:
```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const response = await this.client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

### 6.4 `generateGroundedReply()` — enhanced context

The grounded reply method already accepts `GroundedContext` with products/FAQ.
The change is in **how callers build that context** — they'll use vector search
results instead of keyword-filtered results.

### 6.5 Knowledge Base — Pricing Chunks (seeded)

Currently pricing rules are hardcoded in `pricing.ts` and baked into the
orchestrator prompt. With RAG, we extract these into `KnowledgeChunk` rows
so the LLM can retrieve them dynamically when customers ask pricing questions.

**Pricing knowledge chunks to seed:**

| Title | Content (will be embedded) |
|-------|---------------------------|
| Pricing: Dus Indomie (RSC) Singlewall | Harga dus indomie (RSC) material singlewall dihitung dari luas permukaan: 2×(P×L + P×T + L×T) cm². Rate: Rp 1.3523 per cm². Dibulatkan ke atas kelipatan Rp 100. |
| Pricing: Dus Indomie (RSC) C-Flute | Harga dus indomie (RSC) material C-Flute: luas permukaan × Rp 1.5909 per cm². Dibulatkan ke atas kelipatan Rp 100. |
| Pricing: Dus Indomie (RSC) Doublewall | Harga dus indomie (RSC) material doublewall: luas permukaan × Rp 2.3277 per cm². Dibulatkan ke atas kelipatan Rp 100. |
| Pricing: Dus Pizza (Die-Cut) | Harga dus pizza (die-cut): Sheet = (P+2T+5) × (P+L+2T+2) cm². Rate: Rp 1.1 per cm². Dibulatkan ke atas kelipatan Rp 100. |
| Pricing: Sablon | Biaya sablon Rp 500 per sisi. Maksimal 4 sisi. Total sablon = jumlah sisi × 500 × quantity. |
| Pricing: Minimum Order Sablon | Minimal order sablon: 200 pcs atau Rp 300.000, mana yang tercapai duluan. |
| Pricing: Grand Total | Total = (harga per pcs + sablon per pcs) × quantity. Belum termasuk ongkir. |

### 6.6 Knowledge Base — Bot Behaviour Chunks (seeded)

The ~400-line orchestrator prompt template will be **decomposed** into focused
knowledge chunks. The system prompt stays short (personality + rules), while
detailed behaviour is retrieved via RAG when relevant.

**Bot behaviour knowledge chunks to seed:**

| Title | Content Summary |
|-------|-----------------|
| Bot Behaviour: Greeting Flow | Greet customer, send catalog images, ask what type of box they need. Use "kakak" if name unknown. |
| Bot Behaviour: Box Types Available | Two types: Dus Indomie (RSC) — standard shipping box, Dus Pizza (die-cut) — food packaging. |
| Bot Behaviour: Materials Available | Three materials: Singlewall (tipis, ringan), C-Flute (medium, paling populer), Doublewall (tebal, barang berat). |
| Bot Behaviour: Order Flow | 12-step flow: greeting → collect box specs → calculate price → add to cart → confirm → payment → done. |
| Bot Behaviour: Cart Rules | Customer can add multiple items. Show cart summary before confirming. Allow edit qty, material, sablon. |
| Bot Behaviour: Payment Rules | Payment via DOKU only. Generate payment link on confirm_order. Resend link if asked. |
| Bot Behaviour: Delivery Policy | Pengiriman Jabodetabek 2-3 hari kerja. Luar Jabodetabek 3-5 hari kerja. Ongkir dihitung terpisah. |
| Bot Behaviour: Location | Workshop di [alamat]. Bisa diambil langsung (COD) atau dikirim. |
| Bot Behaviour: Out of Scope | Jika customer tanya hal di luar kardus/packaging, tolak sopan dan arahkan kembali ke produk. |
| Bot Behaviour: Cancellation | Customer bisa cancel sebelum bayar. Setelah bayar, hubungi admin. |
| Bot Behaviour: Formatting | Use WhatsApp formatting: *bold* for emphasis, numbered lists for options. Keep replies 1-3 paragraphs max. |

> **Key insight:** By moving detailed rules into retrievable knowledge chunks,
> the system prompt becomes much shorter (~50 lines of personality/role
> definition). The LLM retrieves specific behaviour rules only when needed,
> reducing token usage and making rules easier to update without redeploying.

---

## 7. Ingestion Flow

```
FAQ entry created/updated
  → FaqService.create() / .update()
  → IngestionService.ingestFaqEntry(id)
  → EmbeddingService.embedText(question + " " + answer)
  → UPDATE "FaqEntry" SET embedding = $1 WHERE id = $2
  → UPSERT "KnowledgeChunk" with sourceType="faq", sourceId=id

Pricing knowledge (seeded once, updated on rate changes)
  → IngestionService.ingestPricingKnowledge()
  → For each pricing chunk: embed(content) → upsert KnowledgeChunk

Bot behaviour (seeded once, updated when rules change)
  → IngestionService.ingestBotBehaviour()
  → For each behaviour chunk: embed(content) → upsert KnowledgeChunk

Seed / Reindex (CLI or admin endpoint)
  → IngestionService.reindexAll()
  → For each FaqEntry: embed(question + " " + answer) → store
  → For each KnowledgeChunk: embed(content) → store
```

---

## 8. Query Flow (Runtime)

```
Customer sends WhatsApp message
  → Orchestrator receives message
  → LLM decides to call `get_faq` or `search_knowledge` tool
  → VectorSearchService.searchFaq(query)
    → EmbeddingService.embedText(query)     // ~50ms
    → pgvector cosine similarity search     // ~10ms
    → Return top-5 results with similarity scores
  → Results injected into tool response
  → LLM generates grounded reply using semantic matches
```

---

## 9. Implementation Order

| Step | Task                                           | Files Changed / Created                  |
| ---- | ---------------------------------------------- | ---------------------------------------- |
| 1    | Schema cleanup — remove unused models          | `schema.prisma`, migration               |
| 2    | Add pgvector extension + `KnowledgeChunk` model + `FaqEntry.embedding` | `schema.prisma`, `docker-compose.yml`, migration |
| 3    | Create `EmbeddingService`                      | `embedding/embedding.service.ts`, `embedding/embedding.module.ts` |
| 4    | Create `VectorSearchService`                   | `vector-search/vector-search.service.ts`, `vector-search/vector-search.module.ts` |
| 5    | Create `IngestionService`                      | `ingestion/ingestion.service.ts`, `ingestion/ingestion.module.ts` |
| 6    | Seed pricing knowledge chunks                  | `scripts/seed-knowledge.ts`              |
| 7    | Seed bot behaviour knowledge chunks            | `scripts/seed-knowledge.ts`              |
| 8    | Update FAQ service to use vector search        | `faq/faq.service.ts`                     |
| 9    | Wire `search_knowledge` tool into orchestrator | `conversations/conversation-orchestrator.service.ts` |
| 10   | Slim down orchestrator system prompt           | `seed.ts` (update prompt template)       |
| 11   | Add ingestion hooks to FAQ CRUD                | `faq/faq.service.ts`                     |
| 12   | Seed script — backfill all embeddings          | `scripts/seed-embeddings.ts`             |
| 13   | Test end-to-end                                | Manual WhatsApp test                     |

---

## 10. Models to Remove — Detailed Cleanup

When removing models, also clean up:
- Related service files (`cardboard/`, etc.)
- Controller endpoints
- Module imports
- `OrderItem.cardboardProductId` FK → make nullable or remove
- Any seed data referencing removed models

### Files to modify/remove:

```
# Remove entirely:
apps/api/src/cardboard/          → CardboardProduct service (pricing.ts stays — it's formula-based)
apps/api/src/pricing/            → If it references CardboardProduct

# Schema changes:
OrderItem.cardboardProductId     → Remove FK, keep custom specs fields
OrderItem.cardboardProduct       → Remove relation

# Keep but modify:
apps/api/src/faq/                → Add vector search integration
apps/api/src/recommendation/     → Rebuild with RAG (later phase)
```

---

## 11. Out of Scope (Future)

- Dashboard UI for knowledge management
- Multi-tenant RAG
- Hybrid search (keyword + vector combined)
- Conversation history RAG (cross-conversation memory)
- Fine-tuning embeddings model
- Chunking strategy for long documents (not needed yet — FAQ entries are short)
