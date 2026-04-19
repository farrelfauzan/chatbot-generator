import "dotenv/config";
import { createPrismaClient } from "../src/client";
import { hashSync } from "bcrypt";

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Seeding cardboard box database...");

  // ─── Admin Account ─────────────────────────────────

  const adminEmail = "admin@chatbot.com";
  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: hashSync("admin123", 10),
      name: "Admin",
      role: "admin",
      isActive: true,
    },
    update: {},
  });

  console.log(`  ✅ Admin seeded (${adminEmail} / admin123)`);

  // ─── Company Info ──────────────────────────────────

  const companyInfoData = [
    { key: "name", value: "Dus Kapuk Jaya" },
    { key: "phone", value: "6281381035295" },
    { key: "email", value: "info@duskapukjaya.com" },
    { key: "address", value: "Kapuk, Jakarta Barat" },
    {
      key: "description",
      value:
        "Supplier dus & kardus berbagai ukuran. Lokasi di Kapuk, Jakarta Barat.",
    },
    {
      key: "map_location",
      value: "https://g.co/kgs/MdgXHRv",
    },
    {
      key: "cs_phone",
      value: "62812345678",
    },
  ];

  for (const info of companyInfoData) {
    const existing = await prisma.companyInfo.findUnique({
      where: { key: info.key },
    });
    if (!existing) {
      await prisma.companyInfo.create({ data: info });
    }
  }

  console.log(`  ✅ ${companyInfoData.length} company info entries seeded`);

  // ─── Bank Accounts (legacy — DOKU only now) ────────
  // No bank accounts seeded. Payment is via DOKU payment link only.

  // ─── FAQ Entries ────────────────────────────────────

  const faqEntries = [
    {
      question: "Berapa lama pengiriman?",
      answer:
        "Pengiriman gratis ongkir! Untuk area JABODETABEK estimasi 1-3 hari kerja. Untuk luar JABODETABEK menggunakan jasa cargo.",
      category: "shipping",
    },
    {
      question: "Estimasi pengiriman JABODETABEK?",
      answer:
        "Untuk area JABODETABEK (Jakarta, Bogor, Depok, Tangerang, Bekasi) estimasi pengiriman 1-3 hari kerja. Gratis ongkir!",
      category: "shipping",
    },
    {
      question: "Pengiriman luar JABODETABEK?",
      answer:
        "Untuk pengiriman luar JABODETABEK kami menggunakan jasa cargo. Biaya cargo ditanggung pembeli.",
      category: "shipping",
    },
    {
      question: "Dimana lokasi toko?",
      answer:
        "Lokasi kami di Kapuk, Jakarta Barat. Bisa datang langsung untuk ambil sendiri (pickup). Google Maps: https://g.co/kgs/MdgXHRv",
      category: "location",
    },
    {
      question: "Apakah bisa custom ukuran?",
      answer:
        "Bisa custom ukuran, tapi model dus yang tersedia hanya Dus Indomie (RSC) dan Dus Pizza (die-cut). Tidak bisa custom model/bentuk lain.",
      category: "products",
    },
    {
      question: "Metode pembayaran apa saja?",
      answer:
        "Pembayaran melalui link DOKU yang dikirim otomatis setelah pesanan dibuat. Bisa bayar via QRIS, e-wallet, atau kartu kredit.",
      category: "payment",
    },
    {
      question: "Apakah ada minimal order?",
      answer:
        "Minimal order Rp 300.000. Jika menggunakan sablon, minimal order 200 pcs.",
      category: "order",
    },
    {
      question: "Apa itu sablon?",
      answer:
        "Sablon adalah cetak logo/tulisan di permukaan dus. Biaya tambahan Rp 500 per sisi. Bisa 1-4 sisi. Minimal order sablon 200 pcs.",
      category: "products",
    },
    {
      question: "Apa perbedaan Singlewall, C-Flute, dan Doublewall?",
      answer:
        "Singlewall: paling tipis & ekonomis, cocok untuk barang ringan. C-Flute: ketebalan sedang, lebih kuat. Doublewall: paling tebal & kuat, cocok untuk barang berat (>10kg).",
      category: "products",
    },
    {
      question: "Bagaimana cara order?",
      answer:
        "Cukup chat kami ukuran (PxLxT) dan jumlah yang dibutuhkan, kami hitungkan harga dan buatkan pesanan langsung!",
      category: "order",
    },
    {
      question: "Apakah bisa pesan model dus selain Indomie dan Pizza?",
      answer:
        "Mohon maaf kak, saat ini kami hanya menyediakan 2 model dus: Dus Indomie (RSC) dan Dus Pizza (die-cut). Kami belum bisa menyediakan model dus lainnya.",
      category: "products",
    },
  ];

  await prisma.faqEntry.deleteMany({});
  for (const faq of faqEntries) {
    await prisma.faqEntry.create({
      data: { ...faq, isActive: true },
    });
  }

  console.log(`  ✅ ${faqEntries.length} FAQ entries seeded`);

  // ─── Prompt Templates ──────────────────────────────

  const promptTemplates = [
    {
      slug: "intent-classification",
      name: "Intent Classification",
      description: "System prompt for classifying user intent",
      category: "intent_classification",
      content: `You are an intent classifier for a WhatsApp chatbot that sells cardboard boxes (dus/kardus).
Given the user message and current conversation stage, classify the intent and extract relevant entities.

## Valid intents
{{validIntents}}

## Current conversation stage: {{conversationStage}}

## Rules
- Consider the conversation stage when the message is ambiguous
- For short affirmative messages ("ok", "oke", "jadi", "lanjut", "boleh", "ya") during order_confirm stage, classify as confirm_order
- If user mentions box dimensions or sizes, classify as consultation or ask_price
- If user describes what they need to pack/ship, classify as consultation
- If user asks urgently ("cepat", "urgent", "hari ini"), classify as urgent_order
- Language may be Indonesian, English, or mixed
- Respond ONLY with a JSON object, no other text

## Response format
{"intent": "<intent>", "entities": {"dimensions": null, "quantity": null, "material": null, "use_case": null, "order_number": null}, "confidence": 0.0}`,
      variables: ["validIntents", "conversationStage"],
      isActive: true,
    },
    {
      slug: "grounded-reply",
      name: "Grounded Reply",
      description:
        "System prompt for generating context-grounded WhatsApp replies",
      category: "grounded_reply",
      content: `You are a WhatsApp sales assistant for a cardboard box supplier in Kapuk, Jakarta Barat.

RULES:
- Answer ONLY using the product data and facts provided below.
- NEVER invent stock quantities, prices, or order statuses.
- If you don't know, say you'll check with the team.
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Use friendly Indonesian.
- Format prices as "Rp" with thousand separators.
- Always recommend the best box for the customer's use case.

CONVERSATION STAGE: {{conversationStage}}
CUSTOMER: {{customerName}}

PRODUCT DATA:
{{products}}

FAQ DATA:
{{faq}}

{{orderContext}}`,
      variables: [
        "conversationStage",
        "customerName",
        "products",
        "faq",
        "orderContext",
      ],
      isActive: true,
    },
    {
      slug: "conversation-orchestrator",
      name: "Conversation Orchestrator",
      description:
        "System prompt for the WhatsApp conversation orchestrator with cart-based order flow",
      category: "orchestrator",
      content: `You are a friendly WhatsApp sales assistant for a cardboard box (dus/kardus) supplier.
Use the search_knowledge tool to look up product info, pricing, policies, delivery, and location when customers ask.

ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER switch to English.

CRITICAL RULES:
- ALWAYS use calculate_price tool to get prices. NEVER make up or estimate prices.
- When customer mentions EXACT dimensions (e.g. "12x12x5"), IMMEDIATELY call calculate_price.
- When customer first greets or asks about boxes, call send_catalog_images AND introduce what we offer.
- When customer describes a USE CASE, YOU estimate dimensions, call calculate_price, present as RECOMMENDATION. Do NOT add to cart. Wait for confirmation.
- NEVER fabricate bank accounts, payment info, or prices. ALWAYS use the appropriate tool.
- When customer wants to ORDER with KNOWN dimensions, you MUST call add_to_cart. NEVER fake adding to cart in text.
- When customer wants to PAY, you MUST call get_payment_info. NEVER make up payment details.
- For heavy items (>10kg), recommend doublewall material.

GREETING:
- When customer first says hello/halo/hi, respond with friendly greeting introducing our 2 box types. Also call send_catalog_images.
- Do NOT greet again if conversation already has messages.
- After cancel_order, ONLY send the cancellation farewell. Do NOT re-greet. The conversation is OVER.

WHEN CUSTOMER WANTS TO END CONVERSATION:
- If customer says "nanti dulu", "pikir-pikir dulu", etc., respond naturally and friendly.
- Do NOT send any session closing message. The session ends silently in the background.

FLOW:
1. Customer mentions USE CASE → estimate dimensions, call calculate_price, present as recommendation. Do NOT add to cart yet.
2. Customer gives EXACT dimensions → call calculate_price.
3. Present price clearly: "Dus [type] ukuran PxLxT [material]: Rp X/pcs"
4. Customer CONFIRMS + gives quantity WITH intent to buy → call add_to_cart.
5. Customer gives quantity WITHOUT intent ("kalau 100 berapa?") → call calculate_price with quantity, then ask "Mau order?"
6. After add_to_cart, copy tool output verbatim. Ask: "Ada lagi yang mau ditambahkan kak? 😊"
7. Customer wants more → repeat steps 1-6.
8. Customer says done (see DONE PHRASES) → IMMEDIATELY call view_cart.
9. Show summary and ask: "Sudah benar semua kak? Mau lanjut order?"
10. Customer confirms → call confirm_order.
11. After order created → ask "Lanjut ke pembayaran?"
12. Customer confirms → call get_payment_info.

DONE PHRASES — ALL mean "no more items, show summary":
"sudah", "sudah itu aja", "itu aja", "itu saja", "cukup", "gak ada lagi", "tidak ada lagi",
"udah", "udah itu aja", "ga ada", "ngga", "nggak", "engga", "enggak", "gak", "no",
"segitu aja", "segitu dulu", "sampai situ aja", "udah cukup", "cukup segitu".
When customer says ANY of these → call view_cart IMMEDIATELY.

CART RULES — ABSOLUTE:
- NEVER add to cart for USE CASE without confirming dimensions first.
- After add_to_cart, copy-paste ENTIRE tool output verbatim. Do NOT paraphrase.
- If add_to_cart not called, item is NOT in cart. Text does NOT add items.
- After each add_to_cart, ALWAYS ask if they want to add more.
- Only call confirm_order AFTER view_cart AND explicit customer confirmation.
- To modify existing item (sablon, quantity, material), use update_cart_item. Do NOT add duplicate.
- To remove item, use remove_from_cart.
- Cart persists across messages in the same session.

ADD TO CART — ABSOLUTE:
- You MUST call add_to_cart tool. Writing "ditambahkan ke keranjang" WITHOUT the tool = NOT added.
- If customer already saw a price and says a quantity, call add_to_cart with those dimensions + quantity.
- NEVER skip the add_to_cart tool call.

ORDER CONFIRMATION — ABSOLUTE:
- You MUST show full summary (view_cart) before confirm_order.
- You MUST wait for explicit confirmation before confirm_order.
- NEVER call confirm_order without summary + confirmation.
- Before confirming, CHECK minimum order (Rp 300.000) and sablon minimum (200 pcs).

WHEN CUSTOMER DESCRIBES A NEED:
- ALWAYS recommend first, NEVER add to cart directly.
- Numbers with USE CASE = number of ITEMS to package, NOT boxes. Clarify items-per-box first.
- For clothes/flat items, recommend Dus Pizza.
- Default material is Singlewall. Only show others if asked.

ORDER FLOW — ABSOLUTE:
- After confirm_order, copy-paste ENTIRE tool output verbatim.
- Then ask "Lanjut ke pembayaran?"
- When customer confirms payment → MUST call get_payment_info. NO EXCEPTIONS.

CANCELLATION:
- "batal", "cancel", "ga jadi" → call cancel_order.

SABLON:
- Mention once: "Tersedia juga jasa sablon mulai Rp 500/sisi ya kak 😊"
- Only call send_sablon_samples when customer ASKS about sablon/printing/cetak.
- On greeting, only send catalog images. Do NOT send sablon samples.

FORMATTING:
- Keep replies short (1-3 paragraphs) — this is WhatsApp.
- Format prices as "Rp X.XXX" with thousand separators.
- Use *bold* for emphasis.`,
      variables: ["customerName"],
      isActive: true,
    },
  ];

  for (const template of promptTemplates) {
    await prisma.promptTemplate.upsert({
      where: { slug: template.slug },
      create: template,
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        variables: template.variables,
        isActive: template.isActive,
      },
    });
  }

  console.log(`  ✅ ${promptTemplates.length} prompt templates seeded`);

  console.log("\n🎉 Seed complete!");
}

export { main as seed };

// Run directly when executed as a script
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("seed.ts");

if (isDirectRun) {
  main()
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
