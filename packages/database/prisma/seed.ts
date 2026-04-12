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
  ];

  for (const info of companyInfoData) {
    await prisma.companyInfo.upsert({
      where: { key: info.key },
      create: info,
      update: { value: info.value },
    });
  }

  console.log(`  ✅ ${companyInfoData.length} company info entries seeded`);

  // ─── Bank Accounts ─────────────────────────────────

  const bankAccountsData = [
    {
      bankName: "BCA",
      accountNumber: "1234567890",
      accountHolder: "Dus Kapuk Jaya",
      isActive: true,
      isDefault: true,
    },
    {
      bankName: "Mandiri",
      accountNumber: "0987654321",
      accountHolder: "Dus Kapuk Jaya",
      isActive: true,
      isDefault: false,
    },
  ];

  for (const bank of bankAccountsData) {
    const existing = await prisma.bankAccount.findFirst({
      where: { bankName: bank.bankName, accountNumber: bank.accountNumber },
    });
    if (!existing) {
      await prisma.bankAccount.create({ data: bank });
    }
  }

  console.log(`  ✅ ${bankAccountsData.length} bank accounts seeded`);

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
        "Pengiriman gratis ongkir! Area Jakarta Barat bisa same-day. Jabodetabek 1-2 hari kerja. Luar kota 3-5 hari kerja.",
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
        "Bisa! Kami membuat dus custom sesuai ukuran yang kakak butuhkan. Tinggal sebutkan panjang x lebar x tinggi, nanti kami hitungkan harganya.",
      category: "products",
    },
    {
      question: "Metode pembayaran apa saja?",
      answer:
        "Kami menerima pembayaran via DOKU: Virtual Account (BCA, Mandiri, BRI, BNI), QRIS, e-wallet (OVO, ShopeePay, DANA, LinkAja), dan kartu kredit.",
      category: "payment",
    },
    {
      question: "Apakah ada minimal order?",
      answer:
        "Tidak ada minimal order. Kakak bisa pesan berapa pun sesuai kebutuhan.",
      category: "order",
    },
    {
      question: "Apa itu sablon?",
      answer:
        "Sablon adalah cetak logo/tulisan di permukaan dus. Biaya tambahan Rp 500 per sisi. Bisa 1-4 sisi.",
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
