# Cardboard Box Chatbot — Revamp Specification

## Branch Strategy

- **Branch**: `cardboard-box-chatbot` (from `main`)
- **Deploy**: VPS runs `cardboard-box-chatbot`, `main` stays as MVP reference

---

## 1. Product Schema Revamp

### 1.1 Cardboard Box Types

| Type | Description |
|------|-------------|
| **Singlewall** | Standard single-layer corrugated |
| **C-Flute** | Medium thickness corrugated |
| **Doublewall** | Heavy-duty double-layer corrugated |

### 1.2 Pricing Table — Dus Baru

| Panjang (cm) | Lebar (cm) | Tinggi (cm) | Surface Area (cm²) | Singlewall (Rp) | C-Flute (Rp) | Doublewall (Rp) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 12 | 12 | 5 | 528 | 714 | 840 | 1,229 |

### 1.3 Pricing Table — Dus Pizza

| Panjang (cm) | Lebar (cm) | Tinggi (cm) | Harga/pcs (Rp) | Min Order | Max Order |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 19 | 11 | 5 | 1,571 | 34 | 42 |

### 1.4 Additional Costs

- **Sablon (printing)**: +Rp 500/sisi

### 1.5 New Database Schema

```
model CardboardProduct {
  id            String   @id @default(cuid())
  name          String                          // e.g. "Dus Baru 12x12x5", "Dus Pizza 19x11x5"
  type          String                          // "dus_baru" | "dus_pizza" | "custom"
  panjang       Float                           // cm
  lebar         Float                           // cm
  tinggi        Float                           // cm
  surfaceArea   Float?                          // cm²
  material      String                          // "singlewall" | "cflute" | "doublewall"
  pricePerPcs   Decimal  @db.Decimal(12, 2)
  minOrder      Int      @default(1)
  stockQty      Int      @default(0)
  isReadyStock  Boolean  @default(false)        // for urgent mode
  leadTimeDays  Int?                            // production time for custom
  imageUrl      String?                         // S3 URL
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model SablonOption {
  id            String   @id @default(cuid())
  name          String                          // e.g. "1 Sisi", "2 Sisi"
  sidesCount    Int
  pricePerSide  Decimal  @db.Decimal(12, 2)     // 500
  isActive      Boolean  @default(true)
}

model CatalogImage {
  id            String   @id @default(cuid())
  title         String
  description   String?
  imageUrl      String                          // S3 URL
  sortOrder     Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
}
```

**Keep existing**: `Order`, `OrderItem`, `Conversation`, `Message`, `Customer`, `Admin`, `CompanyInfo`, `BankAccount`, `FaqEntry`, `PromptTemplate`

**Remove/deprecate**: `Product`, `Category` (replaced by `CardboardProduct`)

---

## 2. Chat Flow

### 2.1 Welcome Message

When user sends first message (greeting or direct inquiry):

```
Halo, kak {{wa_userName}} 👋 lagi cari dus ukuran apa kahh?
Lokasi kita di Kapuk, Jakarta Barat ya 📍

Kakak bisa langsung sebutin:
- Ukuran yang dicari (misal: 30x20x15 cm)
- Kebutuhan (misal: "kardus buat bungkus ikan 15 kg")
- Atau mau lihat katalog dulu

Kami siap bantu! 😊
```

### 2.2 Catalog Request

When user asks to see catalog / available sizes:

1. Fetch active `CatalogImage` records (sorted by `sortOrder`)
2. Send each image via **GOWA API** `POST /send/image` with caption
3. Follow up with text: "Itu beberapa pilihan dus yang kami sediakan ya kak. Ada ukuran yang cocok, atau mau konsultasi dulu?"

### 2.3 Consultation Mode

User describes their need (e.g. "kardus buat bungkus ikan 15 kg"). LLM:

1. Analyzes the use case, weight, and dimensions needed
2. Queries `CardboardProduct` for matching sizes and materials
3. Recommends 1-2 options with reasoning:

```
Baik kak, untuk kebutuhan bungkus ikan 15 kg, kami rekomendasikan:

📦 *Opsi A*: Dus Doublewall 40x30x25 cm — Rp 3.500/pcs
   Cocok untuk barang berat, tahan air lebih baik

📦 *Opsi B*: Dus C-Flute 40x30x25 cm — Rp 2.800/pcs
   Lebih ekonomis, tetap kuat untuk 15 kg

Silakan pilih yang paling sesuai atau jika ingin alternatif lain bisa diinformasikan 😊
```

Also handles general questions:
- Store location → from `CompanyInfo`
- Estimated delivery → from `FaqEntry` or LLM with context
- Custom sizing → lead time info from product data
- Sablon/printing → pricing from `SablonOption`

### 2.4 Follow-Up Selection

After every recommendation or inquiry, always follow up:
- If user picks an option → proceed to order quantity
- If user asks for alternatives → provide more options
- If user goes silent (session timeout) → send reminder: "Kak, masih tertarik dengan dus yang tadi? Kami siap bantu kalau ada pertanyaan 😊"

### 2.5 Urgent Mode

Detect urgency keywords: "cepat", "urgent", "buru-buru", "hari ini", "segera", "darurat"

```
Untuk kebutuhan cepat, kami sarankan pilih ready stock ya kak.
Berikut yang tersedia sekarang:

📦 Dus Singlewall 30x20x15 — Rp 1.200/pcs (stok: 500)
📦 Dus C-Flute 40x30x20 — Rp 2.500/pcs (stok: 200)

Untuk custom ukuran membutuhkan waktu sekitar X hari.
Tapi akan kita usahakan secepatnya! 💪
```

### 2.6 Order Confirmation

Keep current implementation:
- User confirms order → `create_order` tool
- Show order summary with items, quantities, prices
- Set conversation stage to `order_confirm`

### 2.7 Invoice & Payment (Payment Gateway)

New flow:
1. After order confirmed → generate invoice via **payment gateway** API
2. Send payment link to user via GOWA:
   ```
   🧾 *Invoice untuk pesanan Anda*
   No. Pesanan: ORD-XXXXXX
   Total: Rp X.XXX.XXX

   Silakan lakukan pembayaran melalui link berikut:
   {{payment_link}}

   Link berlaku selama 24 jam ya kak 🙏
   ```
3. Listen for **payment gateway webhook**:
   - **Success**: Send thank you message + order processing notification
   - **Failed/Expired**: Notify user + offer retry

```
// Success
✅ Pembayaran berhasil! Terima kasih kak {{name}} 🙏
Pesanan Anda sedang kami proses. Estimasi pengiriman: X hari kerja.
Kami akan update lagi ya!

// Failed
❌ Maaf kak, pembayaran belum berhasil.
Kakak bisa coba lagi melalui link yang sama atau hubungi kami untuk bantuan.
```

---

## 3. LLM / Agent Changes

### 3.1 System Prompt Update

Replace computer store context with cardboard box context:

```
You are a friendly WhatsApp sales assistant for a cardboard box (dus/kardus) supplier
located in Kapuk, Jakarta Barat.

CRITICAL RULES:
- You MUST use provided tools to get product data. NEVER make up sizes, prices, or stock.
- Recommend boxes based on user's use case (weight, item type, quantity).
- Consider material strength: Singlewall < C-Flute < Doublewall.
- Always mention sablon option if user hasn't asked.
- For heavy items (>10kg), recommend Doublewall.
- For food items, mention food-safe options.
- Always follow up with options after recommendation.
- Detect urgency and switch to urgent mode when appropriate.
```

### 3.2 Tool Definitions Update

| Tool | Purpose |
|------|---------|
| `search_products` | Search cardboard boxes by size, material, or use case |
| `list_catalog` | List available box sizes with pricing |
| `get_product_detail` | Get specific box details (size, material, price, stock) |
| `recommend_box` | **NEW** — Recommend box based on use case description |
| `send_catalog_images` | **NEW** — Send catalog images via GOWA |
| `create_order` | Create order (keep current, adapt to CardboardProduct) |
| `get_order_status` | Check order status (keep) |
| `generate_invoice` | **UPDATED** — Generate payment link via payment gateway |
| `get_payment_info` | Get bank transfer info (keep as fallback) |
| `get_faq` | FAQ answers (keep) |
| `check_ready_stock` | **NEW** — Check ready stock items for urgent orders |

### 3.3 Intent Updates

| Intent | Description |
|--------|-------------|
| `greeting` | Keep |
| `browse_catalog` | Keep — triggers catalog images |
| `consultation` | **NEW** — User describes need, triggers recommendation |
| `ask_stock` | Keep — check specific size availability |
| `ask_price` | Keep — price for specific size/material |
| `ask_recommendation` | Keep — maps to `recommend_box` tool |
| `urgent_order` | **NEW** — Detected urgency, show ready stock |
| `create_order` | Keep |
| `confirm_payment` | Keep |
| `ask_order_status` | Keep |
| `ask_sablon` | **NEW** — Asking about printing/sablon |
| `general_qa` | Keep — store location, delivery, etc. |
| `request_human_help` | Keep |

### 3.4 Prompt Templates

Update all prompt templates in DB to reflect cardboard box context. Make editable from dashboard.

---

## 4. S3 Image Storage

### 4.1 Setup

- **Provider**: AWS S3 (or S3-compatible like MinIO for dev)
- **Bucket**: `chatbot-catalog-images`
- **Access**: Pre-signed URLs for upload from dashboard, public read for serving

### 4.2 Image Flow

```
Dashboard → Upload image → S3 → Save URL to CatalogImage/CardboardProduct
Chat → User asks catalog → Fetch CatalogImage URLs → GOWA send/image API → User
```

### 4.3 GOWA Send Image API

```
POST /send/image
{
  "phone": "628xxxx",
  "image": { "url": "https://s3.../catalog.jpg" },
  "caption": "Katalog Dus Baru - Berbagai Ukuran"
}
```

---

## 5. Payment Gateway Integration

### 5.1 Provider

TBD — Options: Midtrans, Xendit, Tripay, or similar

### 5.2 Flow

```
Order Confirmed
  → API creates invoice on payment gateway
  → Receives payment_link + invoice_id
  → Store invoice_id in Order record
  → Send payment_link to user via GOWA

Payment Gateway Webhook (POST /webhooks/payment)
  → Verify signature
  → Update Order status (paid / failed / expired)
  → Send notification to user via GOWA
```

### 5.3 New Schema Addition

```
// Add to Order model:
  paymentLink     String?
  paymentGatewayId String?
  paymentStatus   String?   // "pending" | "paid" | "failed" | "expired"
  paidAt          DateTime?
```

---

## 6. Dashboard Revamp

### 6.1 Updated Pages

| Page | Changes |
|------|---------|
| **Overview** | Update stats for cardboard orders |
| **Products** | Replace with CardboardProduct CRUD (size, material, price, stock, image upload) |
| **Categories** | Remove — no longer needed |
| **Catalog Images** | **NEW** — Manage catalog images for WhatsApp sending |
| **Orders** | Keep — adapt to cardboard products |
| **Conversations** | Keep |
| **Customers** | Keep |
| **FAQ** | Keep |
| **Settings** | Keep (company info, bank accounts) |

### 6.2 New Features

#### Chat History Viewer
- Fetch full conversation history from **GOWA API** (`GET /chat/messages`)
- Display in dashboard with message bubbles (inbound/outbound)
- Show images, timestamps, read receipts if available

#### Prompt Template Editor
- List all `PromptTemplate` records
- Edit content with syntax highlighting / variable preview
- Test prompt with sample input
- Version history (optional)

#### Product Image Upload
- Upload images to S3 from product edit form
- Preview uploaded images
- Drag & drop, image crop/resize (optional)

---

## 7. Implementation Order

### Phase 1 — Foundation
1. Create branch `cardboard-box-chatbot`
2. New Prisma schema (`CardboardProduct`, `SablonOption`, `CatalogImage`, Order payment fields)
3. Run migration + seed cardboard box data
4. S3 module setup (upload/presign)

### Phase 2 — Chat Flow
5. Update system prompt + tool definitions
6. Implement `recommend_box`, `send_catalog_images`, `check_ready_stock` tools
7. Update welcome message flow
8. Update intent classifier for new intents
9. Implement consultation mode logic
10. Implement urgent mode detection
11. Follow-up selection behavior

### Phase 3 — Payment Gateway
12. Payment gateway module (create invoice, verify webhook)
13. Payment webhook controller
14. Update order flow with payment link sending
15. Payment status notifications via GOWA

### Phase 4 — Dashboard
16. CardboardProduct CRUD page with image upload
17. Catalog Images management page
18. Chat history viewer (GOWA API integration)
19. Prompt template editor page
20. Remove categories page, update sidebar/routes

### Phase 5 — Testing & Polish
21. End-to-end testing of full order flow
22. Prompt tuning with real conversations
23. Edge case handling (out of stock, invalid sizes, etc.)

---

## 8. Environment Variables (New)

```env
# S3
S3_REGION=ap-southeast-1
S3_BUCKET=chatbot-catalog-images
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_ENDPOINT=                    # optional, for MinIO

# Payment Gateway
PAYMENT_GATEWAY_PROVIDER=       # midtrans | xendit | tripay
PAYMENT_GATEWAY_SERVER_KEY=xxx
PAYMENT_GATEWAY_WEBHOOK_SECRET=xxx
PAYMENT_GATEWAY_BASE_URL=       # sandbox or production URL
```

---

## Open Questions

1. **Payment gateway provider** — Which one? (Midtrans, Xendit, Tripay?)
2. **Full pricing table** — The sample only shows 1 size for dus baru and 1 for pizza. Need complete list of all sizes and prices.
3. **Custom sizing** — Can users request sizes not in the catalog? If so, how is pricing calculated (per cm² formula)?
4. **Sablon details** — Is Rp 500/sisi the only option, or are there different printing tiers?
5. **Delivery** — Do you handle delivery, or is it customer pickup / third-party courier?
6. **Ready stock list** — Which sizes are typically kept in ready stock?
7. **Min order quantity** — Is there a minimum order per size/material?
