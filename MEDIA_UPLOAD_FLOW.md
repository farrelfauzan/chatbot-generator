# Media Upload Flow (Sablon Design Files)

## Overview

When a customer sends an image/PDF/design file via WhatsApp (for sablon/printing), the bot should:
1. Detect the media in the webhook payload
2. Download the file from Gowa's media URL
3. Upload it to S3
4. Store the reference in the database (linked to conversation + order)
5. Acknowledge to the customer

---

## Current State

| Component | Status |
|-----------|--------|
| S3 Service (`s3.service.ts`) | ✅ Ready — upload, delete, presigned URL |
| Gowa Webhook | ⚠️ Only extracts text/caption — ignores media URL |
| `GowaInboundMessage` type | ⚠️ No `mediaUrl` / `mediaType` fields |
| Database model | ❌ No `CustomerFile` / `DesignFile` table |
| Orchestrator | ❌ No media handling logic |

---

## Flow

```
Customer sends image/PDF via WhatsApp
       │
       ▼
┌─────────────────────────────────────┐
│  Gowa Webhook Payload               │
│  {                                  │
│    event: "message",                │
│    body: "" or caption,             │
│    image: {                         │
│      url: "https://gowa.../media",  │
│      mimetype: "image/jpeg",        │
│      caption: "ini logo saya"       │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Webhooks Controller                │
│  - Extract media URL + mimetype     │
│  - Pass mediaUrl to orchestrator    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Conversation Orchestrator          │
│  - Download file from Gowa media URL│
│  - Upload to S3                     │
│  - Save reference in DB             │
│  - Tell LLM: "Customer sent a file" │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  LLM Response                       │
│  "Terima kasih kak, desainnya sudah │
│   kami terima ✅ Nanti kami cek dan  │
│   konfirmasi ya"                    │
└─────────────────────────────────────┘
```

---

## Schema Changes

```prisma
model CustomerFile {
  id             String       @id @default(cuid())
  customerId     String
  conversationId String
  orderId        String?      // linked after order is created
  fileType       String       // "design" | "reference" | "complaint_photo"
  originalName   String       // original filename or "image.jpg"
  mimeType       String       // "image/jpeg", "application/pdf", etc.
  s3Key          String       // S3 object key
  s3Url          String       // public URL
  fileSize       Int?         // bytes
  createdAt      DateTime     @default(now())
  customer       Customer     @relation(fields: [customerId], references: [id])
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}
```

Add to `Customer`:
```prisma
files CustomerFile[]
```

Add to `Conversation`:
```prisma
files CustomerFile[]
```

---

## Implementation Steps

### 1. Update `GowaInboundMessage` schema
```typescript
export const gowaInboundMessageSchema = z.object({
  phone: z.string().min(1),
  message: z.string(),
  messageId: z.string().optional(),
  timestamp: z.number().optional(),
  senderName: z.string().optional(),
  mediaUrl: z.string().optional(),      // NEW
  mediaType: z.string().optional(),      // NEW: "image/jpeg", "application/pdf"
  mediaFilename: z.string().optional(),  // NEW: original filename
});
```

### 2. Update Webhooks Controller
- Extract `media.url`, `media.mimetype`, `media.filename` from payload
- Pass to normalized `GowaInboundMessage`
- Don't skip media-only messages (currently skipped if no text)

### 3. Add Gowa `downloadMedia` method
```typescript
async downloadMedia(mediaUrl: string): Promise<Buffer> {
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${...}` }
  });
  return Buffer.from(await res.arrayBuffer());
}
```

### 4. Add `CustomerFile` model + migration

### 5. Create `CustomerFilesService`
- `saveFile(customerId, conversationId, file, metadata)` → upload to S3, save DB record
- `findByConversation(conversationId)` → list files
- `linkToOrder(fileId, orderId)` → link after order is created

### 6. Update Orchestrator
- If `payload.mediaUrl` exists:
  1. Download from Gowa
  2. Upload to S3 via `S3Service`
  3. Save to DB via `CustomerFilesService`
  4. Inject into LLM context: `"Customer sent a file: {filename} ({mimeType}). File saved."`
  5. LLM responds naturally (e.g. "Desainnya sudah kami terima kak ✅")

### 7. Link files to order on `confirm_order`
- When order is created, link all unlinked files in the conversation to the order.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Image without caption | message = "[Customer sent an image]", process media |
| PDF/AI/CDR file | Same flow — store with correct mimeType |
| Multiple files in one message | Process each, store all |
| File too large (>16MB) | Acknowledge but note size limit |
| Gowa media URL expires | Download immediately on webhook receive |
| Customer sends file before any order context | Store as "design" type, link to order later |

---

## File Types to Accept

| Extension | MIME Type | Use Case |
|-----------|-----------|----------|
| .jpg/.jpeg/.png | image/* | Logo, design screenshot |
| .pdf | application/pdf | Design file |
| .ai | application/illustrator | Adobe Illustrator |
| .cdr | application/x-cdr | CorelDRAW |
| .svg | image/svg+xml | Vector graphic |
| Any other | * | Store as-is |
