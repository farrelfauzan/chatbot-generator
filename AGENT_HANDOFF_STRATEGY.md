# Agent Handoff Strategy

## Overview

When the bot cannot answer a question (out of scope, escalation needed), it tells the customer "kita diskusikan dulu dengan tim ya kak". At that point, a **human agent takes over** the conversation. After the agent finishes, the bot resumes — and the full chat history (bot + human) remains readable.

---

## Architecture

```
Customer (WhatsApp)
       │
       ▼
   Gowa Webhook
       │
       ▼
┌──────────────────────────────┐
│  Conversation Orchestrator   │
│                              │
│  ┌─ Check conversation mode ─┐
│  │                           │
│  │  mode = "bot"  ──────► LLM agent loop (current flow)
│  │  mode = "agent" ─────► Forward to human agent panel
│  │                           │
│  └───────────────────────────┘
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│   Dashboard (Agent Panel)    │
│   - See active conversations │
│   - Reply as human agent     │
│   - Hand back to bot         │
└──────────────────────────────┘
```

---

## Conversation Modes

| Mode | Who replies | When |
|------|-------------|------|
| `bot` | LLM orchestrator | Default — handles pricing, orders, FAQ |
| `agent` | Human agent via dashboard | After escalation trigger |
| `bot` (resumed) | LLM orchestrator | After agent hands back |

---

## Flow

### 1. Escalation Trigger (Bot → Agent)

Bot detects it cannot handle the request:
- `search_knowledge` returns "Tidak ditemukan informasi yang relevan"
- Knowledge chunk says "escalate" in its content
- Customer explicitly asks for human ("mau ngomong sama admin", "hubungi CS")

Bot actions:
1. Reply to customer: "Baik kak, kami diskusikan dulu dengan tim ya. Nanti dibalas secepatnya 🙏"
2. Update conversation: `mode = 'agent'`, `escalatedAt = now()`
3. Send WhatsApp notification to PIC (hardcoded: 6281381035295): "Customer {phone} butuh bantuan: {escalation reason}"

### 2. Agent Takes Over

While `mode = 'agent'`:
- Inbound messages from customer are **stored** in the same conversation (same `conversationId`)
- Messages are **NOT** sent to LLM
- Messages appear in the agent dashboard in real-time
- Agent replies via dashboard → sent to customer via Gowa as `direction = 'outbound'`, `senderType = 'agent'`

### 3. Agent Hands Back (Agent → Bot)

Agent clicks "Hand back to bot" in dashboard:
1. Update conversation: `mode = 'bot'`
2. Optionally send: "Terima kasih kak, ada yang bisa kami bantu lagi? 😊"
3. Next customer message goes back to LLM with full history (including agent messages)

### 4. History Continuity

All messages (bot, agent, customer) live in the **same `Message` table** under the **same `conversationId`**. The only difference is a `senderType` field:

| senderType | Meaning |
|------------|---------|
| `customer` | Inbound from WhatsApp |
| `bot` | Outbound from LLM |
| `agent` | Outbound from human agent |

---

## Schema Changes

### Conversation model — add fields:

```prisma
model Conversation {
  // ... existing fields ...
  mode         String   @default("bot")    // "bot" | "agent"
  escalatedAt  DateTime?
  escalationReason String?
}
```

### Message model — add field:

```prisma
model Message {
  // ... existing fields ...
  senderType   String   @default("bot")    // "bot" | "agent" | "customer"
}
```

---

## API Endpoints (Dashboard)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations?mode=agent` | List escalated conversations waiting for agent |
| GET | `/conversations/:id/messages` | Get full history (bot + agent + customer) |
| POST | `/conversations/:id/reply` | Agent sends a reply |
| POST | `/conversations/:id/handback` | Agent hands conversation back to bot |
| POST | `/conversations/:id/escalate` | Manually escalate (from dashboard) |

---

## Orchestrator Changes

```typescript
// In handleInboundMessage, BEFORE running agent loop:

if (conversation.mode === 'agent') {
  // Store message but don't process with LLM
  await this.messages.storeInbound(conversation.id, payload.message, { ... });
  // Notify agent dashboard via WebSocket
  this.notifyAgentDashboard(conversation.id, payload.message);
  return; // Don't run LLM
}
```

---

## Escalation in executeTool (search_knowledge)

```typescript
case 'search_knowledge': {
  const results = await this.vectorSearch.searchKnowledge(query, { ... });
  
  // Check if any result says "escalate"
  const needsEscalation = results.some(r => 
    r.content.toLowerCase().includes('→ escalate')
  );
  
  if (results.length === 0 || needsEscalation) {
    // Auto-escalate
    await this.conversations.update(conversation.id, { 
      mode: 'agent', 
      escalatedAt: new Date(),
      escalationReason: query 
    });
    return 'ESCALATE: Pertanyaan ini perlu ditangani oleh tim. Balas customer: "Baik kak, kami diskusikan dulu dengan tim ya. Nanti dibalas secepatnya 🙏"';
  }
  // ... normal flow
}
```

---

## Agent Dashboard Features (MVP)

1. **Conversation list** — filter by `mode = 'agent'`
2. **Chat view** — full history with labels (bot/agent/customer)
3. **Reply box** — send message as agent
4. **Hand back button** — return to bot mode
5. **Real-time updates** — WebSocket for new messages

---

## Notification Flow

When escalation happens:
- Send WhatsApp to PIC (hardcoded `6281381035295`) via Gowa:
  - "⚠️ Customer {customerName} ({phone}) butuh bantuan.\nAlasan: {escalation reason}\nBalas langsung ke nomor customer."

---

## Implementation Phases

### Phase 1 — Core (Backend)
- Add `mode`, `escalatedAt`, `escalationReason` to Conversation
- Add `senderType` to Message
- Skip LLM when `mode = 'agent'`
- Auto-escalate from `search_knowledge` when needed
- Agent reply endpoint

### Phase 2 — Dashboard
- Agent conversation list page
- Chat UI with full history
- Reply & hand-back functionality
- Real-time WebSocket updates

### Phase 3 — Notifications
- WhatsApp notification to PIC (6281381035295) on escalation
- Unread message count badge on dashboard

---

## Edge Cases

| Case | Handling |
|------|----------|
| Agent never replies | Auto-reminder after 15min; auto-close after 24h |
| Customer sends while waiting for agent | Messages stored, agent sees them |
| Multiple agents | First to reply "claims" the conversation (lock) |
| Bot resumes but customer asks same question | Bot has full history, can acknowledge agent's prior answer |
| Session expires while in agent mode | Keep conversation open, don't auto-close agent conversations |
