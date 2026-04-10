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

  // ─── Cardboard Products (Dus Baru) ─────────────────

  interface BoxSize {
    panjang: number;
    lebar: number;
    tinggi: number;
    surfaceArea: number;
    singlewall: number;
    cflute: number;
    doublewall: number;
  }

  const dusBaru: BoxSize[] = [
    {
      panjang: 12,
      lebar: 12,
      tinggi: 5,
      surfaceArea: 528,
      singlewall: 714,
      cflute: 840,
      doublewall: 1229,
    },
    {
      panjang: 15,
      lebar: 10,
      tinggi: 8,
      surfaceArea: 700,
      singlewall: 945,
      cflute: 1113,
      doublewall: 1629,
    },
    {
      panjang: 20,
      lebar: 15,
      tinggi: 10,
      surfaceArea: 1300,
      singlewall: 1755,
      cflute: 2067,
      doublewall: 3024,
    },
    {
      panjang: 25,
      lebar: 20,
      tinggi: 10,
      surfaceArea: 1900,
      singlewall: 2565,
      cflute: 3021,
      doublewall: 4422,
    },
    {
      panjang: 25,
      lebar: 20,
      tinggi: 15,
      surfaceArea: 2250,
      singlewall: 3038,
      cflute: 3578,
      doublewall: 5237,
    },
    {
      panjang: 30,
      lebar: 20,
      tinggi: 15,
      surfaceArea: 2700,
      singlewall: 3645,
      cflute: 4293,
      doublewall: 6284,
    },
    {
      panjang: 30,
      lebar: 25,
      tinggi: 15,
      surfaceArea: 3150,
      singlewall: 4253,
      cflute: 5009,
      doublewall: 7331,
    },
    {
      panjang: 30,
      lebar: 25,
      tinggi: 20,
      surfaceArea: 3700,
      singlewall: 4995,
      cflute: 5882,
      doublewall: 8609,
    },
    {
      panjang: 35,
      lebar: 25,
      tinggi: 15,
      surfaceArea: 3550,
      singlewall: 4793,
      cflute: 5645,
      doublewall: 8262,
    },
    {
      panjang: 35,
      lebar: 25,
      tinggi: 20,
      surfaceArea: 4150,
      singlewall: 5603,
      cflute: 6598,
      doublewall: 9658,
    },
    {
      panjang: 40,
      lebar: 25,
      tinggi: 20,
      surfaceArea: 4600,
      singlewall: 6210,
      cflute: 7312,
      doublewall: 10703,
    },
    {
      panjang: 40,
      lebar: 30,
      tinggi: 20,
      surfaceArea: 5200,
      singlewall: 7020,
      cflute: 8268,
      doublewall: 12103,
    },
    {
      panjang: 40,
      lebar: 30,
      tinggi: 25,
      surfaceArea: 5900,
      singlewall: 7965,
      cflute: 9378,
      doublewall: 13727,
    },
    {
      panjang: 40,
      lebar: 30,
      tinggi: 30,
      surfaceArea: 6600,
      singlewall: 8910,
      cflute: 10489,
      doublewall: 15352,
    },
    {
      panjang: 50,
      lebar: 30,
      tinggi: 20,
      surfaceArea: 6200,
      singlewall: 8370,
      cflute: 9857,
      doublewall: 14427,
    },
    {
      panjang: 50,
      lebar: 30,
      tinggi: 30,
      surfaceArea: 7800,
      singlewall: 10530,
      cflute: 12401,
      doublewall: 18152,
    },
    {
      panjang: 50,
      lebar: 40,
      tinggi: 30,
      surfaceArea: 9400,
      singlewall: 12690,
      cflute: 14944,
      doublewall: 21877,
    },
    {
      panjang: 60,
      lebar: 40,
      tinggi: 30,
      surfaceArea: 10800,
      singlewall: 14580,
      cflute: 17166,
      doublewall: 25128,
    },
    {
      panjang: 60,
      lebar: 40,
      tinggi: 40,
      surfaceArea: 12800,
      singlewall: 17280,
      cflute: 20352,
      doublewall: 29792,
    },
    {
      panjang: 70,
      lebar: 50,
      tinggi: 40,
      surfaceArea: 17800,
      singlewall: 24030,
      cflute: 28298,
      doublewall: 41420,
    },
  ];

  const materials: Array<{ key: keyof BoxSize; label: string }> = [
    { key: "singlewall", label: "singlewall" },
    { key: "cflute", label: "cflute" },
    { key: "doublewall", label: "doublewall" },
  ];

  let productCount = 0;
  let skuCounter = 1;

  for (const box of dusBaru) {
    for (const mat of materials) {
      const sku = `DUS-${String(skuCounter++).padStart(3, "0")}`;
      const name = `Dus ${box.panjang}x${box.lebar}x${box.tinggi} ${mat.label.charAt(0).toUpperCase() + mat.label.slice(1)}`;
      const price = box[mat.key] as number;

      // Random stock: 0-500, with ~15% chance of 0 (out of stock)
      const stockQty =
        Math.random() < 0.15 ? 0 : Math.floor(Math.random() * 500) + 50;
      const isReadyStock = stockQty > 0 && Math.random() > 0.3;

      await prisma.cardboardProduct.upsert({
        where: { sku },
        create: {
          sku,
          name,
          type: "dus_baru",
          panjang: box.panjang,
          lebar: box.lebar,
          tinggi: box.tinggi,
          surfaceArea: box.surfaceArea,
          material: mat.label,
          pricePerPcs: price,
          stockQty,
          isReadyStock,
          leadTimeDays: isReadyStock ? null : Math.floor(Math.random() * 5) + 3,
          isActive: true,
        },
        update: {
          pricePerPcs: price,
          type: "dus_baru",
        },
      });
      productCount++;
    }
  }

  // ─── Cardboard Products (Dus Pizza) ────────────────

  interface PizzaSize {
    panjang: number;
    lebar: number;
    tinggi: number;
    price: number;
    minOrder: number;
    maxOrder: number;
  }

  const dusPizza: PizzaSize[] = [
    {
      panjang: 19,
      lebar: 11,
      tinggi: 5,
      price: 1571,
      minOrder: 34,
      maxOrder: 42,
    },
    {
      panjang: 22,
      lebar: 22,
      tinggi: 5,
      price: 2100,
      minOrder: 20,
      maxOrder: 30,
    },
    {
      panjang: 25,
      lebar: 25,
      tinggi: 5,
      price: 2450,
      minOrder: 20,
      maxOrder: 30,
    },
    {
      panjang: 30,
      lebar: 30,
      tinggi: 5,
      price: 3200,
      minOrder: 15,
      maxOrder: 25,
    },
    {
      panjang: 35,
      lebar: 35,
      tinggi: 5,
      price: 3800,
      minOrder: 10,
      maxOrder: 20,
    },
    {
      panjang: 40,
      lebar: 40,
      tinggi: 5,
      price: 4500,
      minOrder: 10,
      maxOrder: 15,
    },
  ];

  for (const pizza of dusPizza) {
    const sku = `PIZ-${String(skuCounter++).padStart(3, "0")}`;
    const name = `Dus Pizza ${pizza.panjang}x${pizza.lebar}x${pizza.tinggi}`;
    const stockQty =
      Math.random() < 0.15 ? 0 : Math.floor(Math.random() * 300) + 50;
    const isReadyStock = stockQty > 0 && Math.random() > 0.3;

    await prisma.cardboardProduct.upsert({
      where: { sku },
      create: {
        sku,
        name,
        type: "dus_pizza",
        panjang: pizza.panjang,
        lebar: pizza.lebar,
        tinggi: pizza.tinggi,
        material: "singlewall",
        pricePerPcs: pizza.price,
        stockQty,
        isReadyStock,
        leadTimeDays: isReadyStock ? null : Math.floor(Math.random() * 5) + 3,
        isActive: true,
      },
      update: {
        pricePerPcs: pizza.price,
        type: "dus_pizza",
      },
    });
    productCount++;
  }

  console.log(`  ✅ ${productCount} cardboard products seeded`);

  // ─── FAQ Entries ────────────────────────────────────

  const faqEntries = [
    {
      question: "Berapa lama pengiriman?",
      answer:
        "Pengiriman tergantung lokasi. Area Jakarta Barat bisa same-day. Jabodetabek 1-2 hari kerja. Luar kota 3-5 hari kerja.",
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
        "Maaf, saat ini kami hanya menyediakan ukuran yang tersedia di katalog. Tapi kami bisa bantu carikan ukuran terdekat yang sesuai kebutuhan kakak.",
      category: "products",
    },
    {
      question: "Metode pembayaran apa saja?",
      answer:
        "Kami menerima transfer bank (BCA, Mandiri) dan pembayaran via DOKU Wallet.",
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
        "Cukup chat kami ukuran dan jumlah yang dibutuhkan, kami akan buatkan pesanan dan kirim link pembayaran.",
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

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
