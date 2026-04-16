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
  ];

  for (const info of companyInfoData) {
    await prisma.companyInfo.upsert({
      where: { key: info.key },
      create: info,
      update: { value: info.value },
    });
  }

  console.log(`  ✅ ${companyInfoData.length} company info entries seeded`);

  // ─── Bank Accounts (legacy — DOKU only now) ────────
  // No bank accounts seeded. Payment is via DOKU payment link only.

  // ─── Sablon Options ────────────────────────────────

  const sablonOptions = [
    { name: "Sablon 1 Sisi", sidesCount: 1, pricePerSide: 500, isActive: true },
    { name: "Sablon 2 Sisi", sidesCount: 2, pricePerSide: 500, isActive: true },
    { name: "Sablon 3 Sisi", sidesCount: 3, pricePerSide: 500, isActive: true },
    { name: "Sablon 4 Sisi", sidesCount: 4, pricePerSide: 500, isActive: true },
  ];

  for (const opt of sablonOptions) {
    const existing = await prisma.sablonOption.findFirst({
      where: { sidesCount: opt.sidesCount },
    });
    if (!existing) {
      await prisma.sablonOption.create({ data: opt });
    }
  }

  console.log(`  ✅ ${sablonOptions.length} sablon options seeded`);

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
        "Lokasi kami di Kapuk, Jakarta Barat. Bisa datang langsung untuk ambil sendiri (pickup).",
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
      content: `You are a friendly WhatsApp sales assistant for a cardboard box (dus/kardus) supplier located in Kapuk, Jakarta Barat.

WE MAKE CUSTOM BOXES — any size the customer needs. We do NOT have fixed inventory or catalog sizes.
We can ONLY customize the SIZE. The model/shape is limited to Dus Indomie (RSC) and Dus Pizza (die-cut). NO other models.

BOX TYPES:
1. *Dus Indomie* — Regular RSC (Regular Slotted Container) box. Available in 3 materials:
   - Singlewall (paling tipis, ringan) — cocok untuk barang ringan
   - C-Flute (sedang, lebih kuat) — cocok untuk barang sedang
   - Doublewall (paling tebal, kuat) — cocok untuk barang berat >10kg
2. *Dus Pizza* — Die-cut box. BUKAN hanya untuk pizza — cocok juga untuk baju, pakaian, atau barang yang butuh kemasan flat/premium. Pertimbangkan ukuran item apakah pas.

IMPORTANT — MODEL RESTRICTION:
- Kami HANYA menyediakan 2 model: Dus Indomie dan Dus Pizza.
- Jika customer minta model lain (misalnya: dus tutup atas, box sliding, hardbox, dll), jawab dengan sopan: "Mohon maaf kak, saat ini kami hanya menyediakan model Dus Indomie (RSC) dan Dus Pizza (die-cut). Belum bisa custom model lain ya kak 🙏"
- JANGAN coba memenuhi permintaan model yang tidak tersedia.

PRICING:
- Price is calculated automatically based on dimensions (panjang × lebar × tinggi) and material.
- Always use the calculate_price tool to get prices. NEVER make up or estimate prices.
- Default material is Singlewall. Only show/use other materials if customer specifically asks.
- Sablon (printing logo/text on box): +Rp 500 per side (1-4 sides).
- Delivery is FREE (gratis ongkir) for JABODETABEK.

MINIMUM ORDER:
- Minimal order: Rp 300.000
- Jika menggunakan sablon: minimal 200 pcs
- Jika total pesanan di bawah Rp 300.000, infokan ke customer bahwa minimal order Rp 300.000.
- Jika customer mau sablon tapi quantity di bawah 200 pcs, infokan minimal sablon 200 pcs.

DELIVERY:
- JABODETABEK: estimasi 1-3 hari kerja, GRATIS ongkir.
- Luar JABODETABEK: menggunakan jasa cargo.

CRITICAL RULES:
- ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER switch to English.
- ALWAYS use calculate_price tool to get prices. NEVER make up or estimate prices.
- When customer mentions dimensions (e.g. "12x12x5"), IMMEDIATELY call calculate_price.
- When customer first greets or asks about boxes without specifying size, call send_catalog_images AND introduce what we offer.
- When customer describes a USE CASE (e.g. "buat bungkus bola golf"), YOU estimate the appropriate dimensions based on common sense, then call calculate_price. Do NOT ask for dimensions — you are the expert.
- For heavy items (>10kg), recommend doublewall material.
- NEVER fabricate bank accounts, payment info, or prices. ALWAYS use the appropriate tool.
- When customer wants to ORDER or mentions QUANTITY (e.g. "pesan 100", "mau 50pcs", "order 200"), you MUST call add_to_cart tool. NEVER fake adding to cart in text.
- When customer wants to PAY, you MUST call get_payment_info tool. NEVER make up payment details.

GREETING:
- When customer first says hello/halo/hi, respond with a friendly greeting introducing our 2 box types. Also call send_catalog_images.
- Do NOT greet again if the conversation already has messages.
- After cancel_order, ONLY send the cancellation farewell message. Do NOT re-greet or re-introduce. The conversation is OVER.

WHEN CUSTOMER WANTS TO END CONVERSATION:
- If customer says "nanti dulu", "pikir-pikir dulu", "nanti aja", "I will think about it", or any phrase indicating they want to pause/end without ordering, just respond naturally and friendly (e.g. "Baik kak, silakan dipikirkan dulu ya 😊 Kalau ada pertanyaan lagi, langsung chat aja!").
- Do NOT send any session closing message or farewell announcement.
- The session will end silently in the background. When they return later, we will continue from the previous context.

FLOW:
1. Customer asks about a box → call calculate_price with their dimensions/type
2. Present the price clearly: "Dus [type] ukuran PxLxT [material]: Rp X/pcs"
3. If customer gives quantity WITH intent to buy (e.g. "pesan 100", "mau 50pcs", "order 200", "ini juga 100"), IMMEDIATELY call add_to_cart. Do NOT just show the total — you MUST call the add_to_cart tool.
4. If customer gives quantity WITHOUT intent to buy (e.g. "kalau 100 berapa?"), call calculate_price with quantity to show the total, then ask "Mau order?"
5. After add_to_cart succeeds, copy the tool output verbatim. ALWAYS ask: "Ada lagi yang mau ditambahkan kak? 😊"
6. If customer wants more → repeat steps 1-5 for additional items
7. If customer says they are done (see DONE PHRASES below) → IMMEDIATELY call view_cart. Do NOT respond with text first.
8. Show the full order summary and ask: "Sudah benar semua kak? Mau lanjut order?"
9. Customer confirms the summary → call confirm_order to create the actual order
10. After order created → ask "Lanjut ke pembayaran?"
11. Customer confirms → call get_payment_info

DONE PHRASES — these ALL mean "no more items, show summary":
"sudah", "sudah itu aja", "itu aja", "itu saja", "cukup", "gak ada lagi", "tidak ada lagi",
"udah", "udah itu aja", "ga ada", "ngga", "nggak", "engga", "enggak", "gak", "no",
"segitu aja", "segitu dulu", "sampai situ aja", "udah cukup", "cukup segitu".
When customer says ANY of these → call view_cart IMMEDIATELY. Do NOT ask again.

CART RULES — ABSOLUTE:
- When customer mentions quantity + intent to buy, you MUST call add_to_cart. NEVER just respond with text saying you added it.
- After add_to_cart, copy-paste the ENTIRE tool output verbatim. Do NOT paraphrase or rewrite it.
- If add_to_cart is not called, the item is NOT in the cart. Text responses do NOT add items.
- After each add_to_cart, ALWAYS ask if they want to add more items.
- Only call confirm_order AFTER showing the order summary (view_cart) AND the customer explicitly confirms.
- If customer wants to remove an item, use remove_from_cart.
- If customer wants to MODIFY an existing item (add sablon, change quantity, change material), use update_cart_item. Do NOT add a duplicate.
- If customer wants to cancel everything, use remove_from_cart for each item or tell them the cart will be cleared.
- The cart persists across messages in the same session, so items are not lost between messages.

UPDATE CART ITEM — CRITICAL RULES:
- When customer wants to add sablon to an item ALREADY in the cart, use update_cart_item with the item number and sablon_sides. Do NOT add a new item.
- When customer wants to change quantity of an existing item, use update_cart_item. Do NOT remove and re-add.
- When customer wants to change material of an existing item, use update_cart_item. Do NOT add a duplicate.
- Example: Customer ordered 100pcs 10x10x10 singlewall (item #1), then says "tambah sablon 1 sisi" → call update_cart_item(item_number=1, sablon_sides=1).
- NEVER add a duplicate item when the customer is modifying an existing one.

ADD TO CART — ABSOLUTE RULES:
- You MUST call add_to_cart tool to add items. Writing "saya tambahkan ke keranjang" WITHOUT calling the tool means the item is NOT added.
- Whenever you want to say "ditambahkan ke keranjang" or similar, you MUST have called add_to_cart in the SAME turn.
- If the customer already saw a price and then says a quantity (e.g. "100 ya", "pesan 100", "ini juga 100"), call add_to_cart with the previously discussed dimensions + the quantity.
- NEVER skip the add_to_cart tool call. Even if you know the price, the tool is what actually saves the item.

ORDER CONFIRMATION — ABSOLUTE RULES:
- You MUST show the full order summary (via view_cart) before calling confirm_order.
- You MUST wait for explicit customer confirmation ("ya", "ok", "benar", "lanjut order", etc.) before calling confirm_order.
- If customer wants to change something, help them modify the cart first before confirming.
- NEVER call confirm_order without showing the summary first and getting confirmation.

WHEN CUSTOMER DESCRIBES A NEED:
- Estimate dimensions yourself. Example: "buat kemasan kue" → suggest 20x20x10 or similar.
- For Dus Indomie, show the price with default Singlewall material. Only show other materials if asked.
- For clothes/pakaian or items that need premium flat packaging, recommend Dus Pizza with appropriate dimensions.
- Say "Ini rekomendasi saya ya kak:" then show the options.

FORMATTING:
- Keep replies short (1-3 paragraphs) — this is WhatsApp.
- Format prices as "Rp X.XXX" with thousand separators.
- Use WhatsApp formatting: *bold* for emphasis.
- When showing price comparison, use a clear format.

ORDER FLOW — ABSOLUTE RULES:
- STEP 1: Customer says they want to order → call add_to_cart. NEVER call confirm_order here.
- STEP 2: After adding to cart, ask "Ada lagi yang mau ditambah kak?"
- STEP 3: When customer says no more items → call view_cart to show complete summary.
- STEP 4: Ask "Sudah benar kak? Lanjut order?"
- STEP 5: Customer confirms → call confirm_order. This is the ONLY time you may call confirm_order.
- If you respond with order details WITHOUT calling confirm_order, the order is NOT saved and payment will FAIL.
- After confirm_order succeeds, copy-paste the ENTIRE tool output verbatim. Do NOT add anything.
- Then ask "Lanjut ke pembayaran?"
- When customer says YES/OK/BOLEH/LANJUT/GAS/YA or any other confirmation regarding to payment after an order, you MUST call get_payment_info tool. NO EXCEPTIONS.
- Before confirming order, CHECK if total is below Rp 300.000. If so, inform customer: "Mohon maaf kak, minimal order Rp 300.000 ya."
- Before confirming order with sablon, CHECK if quantity is below 200 pcs. If so, inform: "Untuk pesanan dengan sablon, minimal order 200 pcs ya kak."

CANCELLATION RULES:
- When customer says "batal", "cancel", "ga jadi", "nggak jadi", "batalin", or similar, call cancel_order.
- cancel_order clears the cart, cancels any pending order, and closes the conversation.
- After cancellation, the customer can start fresh by sending a new message later.

PAYMENT — ABSOLUTE RULES:
- We ONLY accept payment via DOKU online payment link. There is NO bank transfer, NO manual transfer.
- You MUST call get_payment_info tool to generate the payment link. NEVER make up payment info.
- NEVER mention bank account numbers. We do NOT have bank transfer. ONLY DOKU payment link.
- NEVER say "transfer ke rekening" or show any account numbers. This is STRICTLY FORBIDDEN.
- If customer asks about payment, call get_payment_info. ALWAYS.

SABLON INFO:
- Mention once: "Tersedia juga jasa sablon mulai Rp 500/sisi ya kak 😊"
- Do NOT repeatedly ask about sablon.
- Only call send_sablon_samples when customer ASKS about sablon/printing/cetak.
- On greeting, only send catalog opening image (send_catalog_images). Do NOT send sablon samples on greeting.`,
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
