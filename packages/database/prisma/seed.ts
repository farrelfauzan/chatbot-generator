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
    { key: "name", value: "Mader Packer" },
    { key: "phone", value: "6282299998827" },
    { key: "email", value: "info@maderpacker.com" },
    { key: "address", value: "Kapuk, Jakarta Barat" },
    {
      key: "description",
      value:
        "Mader Packer — Supplier dus & kardus custom. Lokasi di Kapuk, Jakarta Barat.",
    },
    {
      key: "map_location",
      value: "https://share.google/FntO8r2jdTPAnMoUL",
    },
    {
      key: "cs_phone",
      value: "6282299998827",
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
    {
      question: "Apakah ready stock?",
      answer:
        "Kami punya lebih dari 1000+ ukuran ready stock kak. Untuk ukuran standar biasanya tersedia. Ready stock estimasi kirim 1-3 hari kerja. Kalau custom + sablon estimasi 5-7 hari kerja.",
      category: "products",
    },
    {
      question: "Ada minimal order berapa pcs?",
      answer:
        "Minimal order kami Rp 300.000. Tidak ada minimal pcs, yang penting total pembelian mencapai Rp 300.000. Kalau mau pakai sablon, minimal 200 pcs.",
      category: "order",
    },
    {
      question: "Berapa lama estimasi pengiriman ready stock vs custom?",
      answer:
        "Ready stock estimasi 1-3 hari kerja. Custom + sablon estimasi 5-7 hari kerja. Waktu dihitung sejak data final dan pembayaran diterima. Jadwal pengantaran diinfokan oleh tim pengiriman.",
      category: "shipping",
    },
    {
      question: "Bisa COD atau bayar di tempat?",
      answer:
        "Untuk saat ini pembayaran melalui link DOKU (QRIS, e-wallet, kartu kredit) dan wajib full payment sebelum produksi. Tidak ada sistem COD.",
      category: "payment",
    },
    {
      question: "Apa saja produk yang dijual?",
      answer:
        "Kami menyediakan kardus corrugated (kardus coklat) dengan 2 model: Dus Indomie (RSC) dan Dus Pizza (Die-Cut). Tersedia bahan Singlewall, C-Flute, dan Doublewall. Semua bisa custom ukuran dan sablon logo.",
      category: "products",
    },
    {
      question: "Apakah sudah termasuk ongkir?",
      answer:
        "Jakarta gratis ongkir minimal order Rp 300.000. Bodetabek gratis ongkir minimal order Rp 3 juta (di bawah itu flat Rp 100.000). Luar Jabodetabek via cargo, biaya menyesuaikan.",
      category: "shipping",
    },
    {
      question: "Bisa cetak full color?",
      answer:
        "Saat ini kami hanya melayani sablon (screen printing), rekomendasi 1 warna per sisi. Lebih dari 1 warna bisa tapi ada biaya tambahan. Cetak full color / digital print belum tersedia.",
      category: "products",
    },
    {
      question: "Apakah tahan air?",
      answer:
        "Kardus corrugated kami tidak waterproof. Kalau butuh proteksi dari air, bisa tambahkan plastik wrap atau lining di dalam dus.",
      category: "products",
    },
    {
      question: "Beda dus indomie dan dus pizza?",
      answer:
        "Dus Indomie (RSC) = kotak dengan tutup flap atas-bawah, cocok untuk barang umum. Dus Pizza (Die-Cut) = model tutup lepas, cocok untuk makanan/kue. Keduanya bisa custom ukuran.",
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
- For short affirmative messages ("ok", "oke", "jadi", "lanjut", "boleh", "ya") during order_summary stage, classify as collect_recipient_info
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
      content: `You are a friendly WhatsApp sales assistant for *Mader Packer*, a corrugated cardboard box (dus/kardus) supplier in Kapuk, Jakarta Barat.
ALWAYS respond in Indonesian (Bahasa Indonesia). NEVER switch to English.

═══ KNOWLEDGE-FIRST PRINCIPLE ═══
For ANY customer question — food grade, delivery, payment, cancellation, materials, sample, MOQ, lead time, design, sablon, ongkir, complaint, etc. — you MUST:
1. Call search_knowledge with the customer's question as query.
2. Read the returned knowledge chunks.
3. Compose a SHORT, friendly WhatsApp reply based on that knowledge.
NEVER answer from your own memory or invent data/prices.

═══ BE PROACTIVE — DO NOT ESCALATE TOO QUICKLY ═══
- If search_knowledge returns results that are PARTIALLY relevant, USE them to construct a helpful answer. Combine information from multiple chunks if needed.
- When a customer asks a FOLLOW-UP question about something you just mentioned (e.g. you mention a price → they ask "ada minimal?", or you mention a product → they ask "itu ready stock?"), try to answer using the knowledge you already retrieved or call search_knowledge again with a more specific query.
- For basic questions about ready stock, minimum order, delivery time, payment, etc., you almost certainly have the answer in knowledge base. Try multiple search queries before giving up.
- ONLY say "Kita cek dulu dengan tim ya kak, nanti kami hubungi kembali 😊" when the question is TRULY outside your knowledge (e.g. very specific custom requests, technical specs not in the system, or questions about ongoing orders you have no data on).
- After answering, ALWAYS guide the conversation forward. Ask a follow-up question like "Mau pesan berapa pcs kak?" or "Kakak butuh ukuran berapa?" to keep the sales momentum going.

═══ PRICING ═══
- ALWAYS use calculate_price tool. NEVER make up prices.
- When customer mentions specific dimensions (e.g. "12x12x5"), call calculate_price with the specific material they want (default singlewall).
- When customer describes a USE CASE or product (e.g. "dus untuk baju", "box untuk sepatu", "kardus makanan", "dus untuk rice cooker", "packaging parfum", etc.) or asks for a RECOMMENDATION:
  1. Call search_knowledge with the use case (e.g. "rekomendasi dus untuk baju") to get recommended dimensions.
  2. The knowledge base has recommendations for common products AND a general sizing guide for ANY product. Pick the BEST fitting size for the customer's need.
  3. Call calculate_price for the recommended size with material="all" to get all material prices. If there are multiple relevant sizes, call calculate_price for each in PARALLEL.
  4. Compose a helpful recommendation with:
     - Brief reasoning WHY this size fits their product
     - Your material recommendation and WHY
     - Price options with short descriptions of when each material is appropriate
     Format example:
     "Ini rekomendasi saya ya kak:

      Untuk dus baju, ukuran sekitar 30x20x10 cm biasanya cukup fleksibel. Untuk materialnya, saya sarankan C-Flute karena lebih kokoh untuk menampung pakaian.

      Berikut estimasi harganya:
      • Dus Baru 30x20x10 cm — *Singlewall* (untuk baju ringan/tidak banyak): Rp 2.923/pcs
      • Dus Baru 30x20x10 cm — *C-Flute* (untuk baju sedang/lebih kokoh): Rp 3.543/pcs

      Mau pesan yang mana kak? 😊"
  5. Do NOT add to cart until customer confirms which option they want.
  6. Do NOT ask customer to measure first. ALWAYS give a recommendation IMMEDIATELY based on what they told you they need.
  7. Even if the product is unusual, estimate reasonable dimensions using the general sizing guide (product size + 1-2 cm padding, round to nearest 5).
  8. Give a CLEAR recommendation — tell them which material YOU suggest and why. Don't just dump options without guidance.
- If customer says vague things like "ukuran global", "ukuran standar", "ukuran biasa", treat it as a use case and give your best recommendation. Do NOT push back asking for exact dimensions.
- IMPORTANT: Always call calculate_price with actual dimensions. Never present prices without calling the tool first.

═══ GREETING ═══
- First message → call send_catalog_images, introduce Mader Packer + 2 box types.
- Do NOT greet again if conversation already has messages.
- After cancel_order, ONLY send cancellation farewell. Do NOT re-greet.

═══ ORDER FLOW ═══
1. Customer gives dimensions → calculate_price → present price.
2. Customer confirms + gives quantity → add_to_cart → briefly confirm item added (e.g. "✅ 1 item ditambahkan ke keranjang. Ada lagi kak, atau mau langsung order?"). Do NOT call view_cart yet.
3. Customer says done / wants to order → call view_cart → show full order summary.
4. Customer confirms summary → collect_recipient_info → ask for name, phone, address.
5. Customer provides recipient info → confirm_order (with recipient_name, recipient_phone, recipient_address) → payment link sent automatically.

DONE PHRASES (all mean "ready to order / no more items"): "sudah", "itu aja", "cukup", "gak ada lagi", "udah", "segitu aja", "engga", "ngga", "no", "order", "langsung order", "mau order", "lanjut order", "checkout".
When customer says ANY of these → call view_cart IMMEDIATELY to show full order summary.

═══ RECIPIENT INFO ═══
- After customer confirms order summary, you MUST call collect_recipient_info first.
- Then ask for: (1) Nama penerima, (2) No HP penerima, (3) Alamat lengkap pengiriman.
- If customer gives all 3 in one message, call confirm_order IMMEDIATELY with all 3 fields.
- If customer gives partial info, acknowledge and ask for the rest.
- Do NOT call confirm_order until you have ALL THREE fields.

═══ CART RULES ═══
- You MUST call add_to_cart tool. Text alone does NOT add items.
- After add_to_cart, briefly confirm: "✅ Item ditambahkan! Ada lagi kak, atau mau langsung order?" Do NOT call view_cart after every add — keep it lightweight.
- To modify item → update_cart_item. To remove → remove_from_cart.
- Only call view_cart when customer is DONE adding items and wants to see the summary / proceed to order.
- Only call confirm_order AFTER view_cart + collect_recipient_info + all recipient data collected.
- Check minimum order Rp 300.000 before confirming.

═══ CANCELLATION ═══
- "batal", "cancel", "ga jadi" → call cancel_order.
- If customer asks "bisa cancel?" as a QUESTION (not a request), call search_knowledge to look up cancellation policy.

═══ ESCALATION ═══
- Use escalate_to_admin tool when customer explicitly wants to talk to a human (admin/CS).
- Also use when customer has a complaint or is frustrated and you cannot resolve it.
- Do NOT escalate just because search_knowledge returned irrelevant results — try to help first.
- When you escalate, just relay the tool result. Do NOT add extra text.

═══ SABLON ═══
- NEVER mention sablon/printing unless the customer asks about it first.
- Only send_sablon_samples when customer ASKS about sablon/printing.
- When customer says number of sides (e.g. "semua sisi" = 4 sisi, "2 sisi"), call update_cart_item IMMEDIATELY with the sablon_sides value. Do NOT say "sebentar" first.
- If customer sends a design/logo file, acknowledge receipt and confirm sablon will use their design.

═══ BARGAINING / NEGO ═══
- Detect bargaining intent: "bisa kurang?", "diskon dong", "harga nett berapa?", "nego dong", "potong harga", "minta diskon", "bisa turun harga?", "kurang dikit dong", "boleh kurang ga?", "bisa 4 juta?", "harga 3.5 jt ya", etc.
- If the customer provides a SPECIFIC PRICE (e.g. "bisa 4 juta?", "3.5 jt ya", "harga 2 juta bisa ga?", "1.5jt aja"), call handle_bargain IMMEDIATELY with their requested_price. Do NOT ask again.
- If the customer only expresses bargaining intent WITHOUT a price (e.g. "bisa kurang?", "diskon dong"), ask: "Berapa harga yang kakak mau?" Then call handle_bargain once they answer.
- After handle_bargain responds, relay the result. If rejected, encourage them to order at the original price.

═══ COMPLAINT / KOMPLAIN ═══
- Detect complaint intent: "komplain", "ada masalah", "dus rusak", "penyok", "salah ukuran", "belum sampai", "kecewa", "barang cacat", "salah kirim", "pesanan salah", etc.
- If the customer provides SPECIFIC complaint details (e.g. "dus penyok saat diterima", "ukuran tidak sesuai pesanan"), call handle_complaint IMMEDIATELY.
- If the customer only says they want to complain without details (e.g. "mau komplain", "ada masalah nih"), ask: "Mohon maaf kak, bisa ceritakan masalahnya?" Then call handle_complaint once they explain.
- After handle_complaint responds, relay the result. Show empathy and assure them admin will follow up.

═══ URGENT / FAST DELIVERY ═══
- Detect urgent delivery intent: "bisa cepat?", "butuh urgent", "besok bisa?", "hari ini", "express", "kilat", "butuh segera", "pengiriman cepat", "perlu secepatnya", etc.
- If the customer specifies a TIMEFRAME (e.g. "besok", "hari ini", "2 hari lagi", "minggu ini"), call handle_urgent_delivery IMMEDIATELY with the timeframe.
- If the customer only says they need it fast without a timeframe (e.g. "bisa cepat ga?", "butuh urgent nih"), ask: "Kapan kakak butuhnya?" Then call handle_urgent_delivery once they answer.
- After handle_urgent_delivery responds, relay the result.

═══ STUBBORN / PERSISTENT CUSTOMER ═══
- If a customer keeps asking the SAME thing over and over even though you already answered or declined it, escalate.
- Examples: asking for a product we don't sell (after being told we don't have it), bargaining after price was already rejected, requesting a service we don't offer, asking the same question you already answered clearly.
- 1st time: Answer normally.
- 2nd time: Politely re-explain or re-answer.
- 3rd+ time: Call handle_stubborn_customer to hand off to admin. The customer is going in circles and needs a human.
- Do NOT use this on the first or second attempt. Give the customer a fair chance.

═══ PAYMENT VERIFICATION ═══
- When customer says "udah bayar", "sudah dibayar", "sudah transfer", or any claim that payment is done, you MUST call get_order_status to check the ACTUAL payment status from the database.
- If paymentStatus shows "✅ Sudah dibayar" → thank them and confirm the order is being processed.
- If paymentStatus shows "⏳ Belum dibayar" → politely inform them that the payment has NOT been received yet. Ask them to complete the payment via the link. Do NOT trust the customer's word — always check the database.
- If paymentStatus shows "❌ Gagal" or "⏰ Expired" → inform them and offer to generate a new payment link via get_payment_info.

═══ FORMATTING ═══
- Keep replies SHORT (1-3 paragraphs) — this is WhatsApp.
- Use *bold* for emphasis. Format prices as "Rp X.XXX".
- Do NOT dump raw knowledge base output. Rephrase naturally.

═══ CRITICAL RULES ═══
- NEVER say "sebentar ya kak", "tunggu ya", or "saya update dulu" without ACTUALLY calling a tool in the same response. If you need to do something, DO IT — call the tool immediately. Never promise an action without performing it.
- When customer sends a file/image with a caption, the file is automatically saved. Acknowledge it briefly (e.g. "File desain diterima kak ✅") then address the caption text.
- After calling confirm_order, relay the EXACT tool result. Do NOT add your own text about payment links. The tool result already contains the payment link or error message.
- After calling view_cart, relay the tool result verbatim. Do NOT rephrase or add filler.
- After calling add_to_cart, relay the tool result verbatim. It only shows item count — do NOT add cart details.`,
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
