import "dotenv/config";
import { createPrismaClient } from "../src/client";
import { hashSync } from "bcrypt";

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

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
    { key: "name", value: "Toko Komputer Jaya" },
    { key: "phone", value: "6281381035295" },
    { key: "email", value: "info@tokokomputerjaya.com" },
    { key: "address", value: "Jl. Mangga Dua Raya No. 10, Jakarta Pusat" },
    {
      key: "description",
      value: "Toko komputer & laptop terpercaya sejak 2010",
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
      accountHolder: "PT Toko Komputer Jaya",
      isActive: true,
      isDefault: true,
    },
    {
      bankName: "Mandiri",
      accountNumber: "0987654321",
      accountHolder: "PT Toko Komputer Jaya",
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

  // ─── Categories ────────────────────────────────────

  const categoriesData = [
    {
      name: "Laptop",
      description:
        "Laptop untuk berbagai kebutuhan: kerja, gaming, desain, dan sehari-hari.",
    },
    {
      name: "PC",
      description:
        "PC Desktop untuk office, desain grafis, gaming, dan custom build.",
    },
    {
      name: "Monitor",
      description: "Monitor berkualitas untuk produktivitas dan desain.",
    },
    {
      name: "Accessories",
      description: "Aksesoris komputer: keyboard, mouse, headset, dan lainnya.",
    },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const result = await prisma.category.upsert({
      where: { name: cat.name },
      create: { ...cat, isActive: true },
      update: { description: cat.description },
    });
    categoryMap[cat.name.toLowerCase()] = result.id;
  }

  console.log(`  ✅ ${categoriesData.length} categories seeded`);

  // ─── Products ──────────────────────────────────────

  const products = [
    {
      sku: "LAP-001",
      name: "Laptop ProBook 14",
      description:
        "Laptop 14 inch, Intel Core i5, 16GB RAM, 512GB SSD. Cocok untuk kerja dan multitasking.",
      categoryId: categoryMap["laptop"],
      price: 12500000,
      stockQty: 15,
      isActive: true,
    },
    {
      sku: "LAP-002",
      name: "Laptop UltraSlim 13",
      description:
        "Laptop ultrabook 13 inch, AMD Ryzen 7, 16GB RAM, 256GB SSD. Ringan dan portable.",
      categoryId: categoryMap["laptop"],
      price: 10800000,
      stockQty: 8,
      isActive: true,
    },
    {
      sku: "PC-001",
      name: "PC Design Studio RTX 4060",
      description:
        "PC Desktop: Intel Core i7, 32GB RAM, RTX 4060, 1TB NVMe SSD. Ideal untuk desain grafis.",
      categoryId: categoryMap["pc"],
      price: 18500000,
      stockQty: 5,
      isActive: true,
    },
    {
      sku: "PC-002",
      name: "PC Office Essential",
      description:
        "PC Desktop: Intel Core i3, 8GB RAM, 256GB SSD. Untuk kebutuhan office dan admin.",
      categoryId: categoryMap["pc"],
      price: 5200000,
      stockQty: 20,
      isActive: true,
    },
    {
      sku: "MON-001",
      name: "Monitor IPS 27 inch 4K",
      description:
        "Monitor 27 inch IPS 4K UHD. Warna akurat untuk desain dan editing.",
      categoryId: categoryMap["monitor"],
      price: 4500000,
      stockQty: 12,
      isActive: true,
    },
    {
      sku: "ACC-001",
      name: "Mechanical Keyboard RGB",
      description: "Keyboard mekanikal full-size, switch blue, RGB backlight.",
      categoryId: categoryMap["accessories"],
      price: 850000,
      stockQty: 30,
      isActive: true,
    },
    {
      sku: "ACC-002",
      name: "Wireless Mouse Ergonomic",
      description:
        "Mouse wireless ergonomic dengan silent click. Battery life 12 bulan.",
      categoryId: categoryMap["accessories"],
      price: 350000,
      stockQty: 50,
      isActive: true,
    },
    {
      sku: "LAP-003",
      name: "Laptop Gaming RTX 4070",
      description:
        "Laptop gaming 15.6 inch, Intel Core i7, 32GB RAM, RTX 4070, 1TB SSD. Untuk gaming dan rendering.",
      categoryId: categoryMap["laptop"],
      price: 22000000,
      stockQty: 3,
      isActive: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: product,
    });
  }

  console.log(`  ✅ ${products.length} products seeded`);

  // ─── FAQ Entries ────────────────────────────────────

  const faqEntries = [
    {
      question: "Berapa lama pengiriman?",
      answer:
        "Pengiriman biasanya memakan waktu 2-5 hari kerja tergantung lokasi Anda.",
      category: "shipping",
    },
    {
      question: "Apakah ada garansi?",
      answer:
        "Semua produk memiliki garansi resmi 1 tahun. Laptop dan PC mendapat garansi 2 tahun.",
      category: "warranty",
    },
    {
      question: "Metode pembayaran apa saja yang diterima?",
      answer:
        "Kami menerima transfer bank (BCA, Mandiri, BNI, BRI), e-wallet (GoPay, OVO, Dana), dan COD untuk area tertentu.",
      category: "payment",
    },
    {
      question: "Apakah bisa cicilan?",
      answer:
        "Untuk pembelian di atas Rp 3.000.000, kami menyediakan cicilan 0% hingga 12 bulan melalui kartu kredit tertentu.",
      category: "payment",
    },
    {
      question: "Bagaimana cara retur produk?",
      answer:
        "Retur dapat dilakukan dalam 7 hari setelah penerimaan jika produk cacat atau tidak sesuai. Hubungi admin untuk proses retur.",
      category: "returns",
    },
    {
      question: "Apakah tersedia custom build PC?",
      answer:
        "Ya, kami menerima pesanan custom build PC. Silakan ceritakan kebutuhan spesifikasi Anda dan kami akan berikan quotation.",
      category: "products",
    },
  ];

  // Delete existing FAQ entries and re-create
  await prisma.faqEntry.deleteMany({});
  for (const faq of faqEntries) {
    await prisma.faqEntry.create({
      data: { ...faq, isActive: true },
    });
  }

  console.log(`  ✅ ${faqEntries.length} FAQ entries seeded`);

  // ─── Sample Customer ───────────────────────────────

  await prisma.customer.upsert({
    where: { phoneNumber: "6281234567890" },
    create: {
      phoneNumber: "6281234567890",
      name: "Demo Customer",
      email: "demo@example.com",
    },
    update: {
      name: "Demo Customer",
    },
  });

  console.log("  ✅ Sample customer seeded");

  // ─── Prompt Templates ──────────────────────────────

  const promptTemplates = [
    {
      slug: "intent-classification",
      name: "Intent Classification",
      description:
        "System prompt for classifying user intent from WhatsApp messages",
      category: "intent_classification",
      content: `You are an intent classifier for a WhatsApp sales chatbot that sells computer & laptop products.
Given the user message and current conversation stage, classify the intent and extract relevant entities.

## Valid intents
{{validIntents}}

## Intent descriptions
- greeting: Greetings, salutations, opening messages
- browse_catalog: Wants to see available products/catalog
- ask_stock: Asking about product availability/stock
- ask_price: Asking about product pricing
- ask_product_detail: Asking for specs, features, or details of a specific product
- ask_recommendation: Wants product suggestions based on needs/budget
- compare_products: Wants to compare two or more products
- calculate_price: Wants total/subtotal with shipping/tax/discount
- objection_or_hesitation: Expressing doubt, price concern, or wanting to delay
- create_order: Wants to place an order / buy / checkout
- request_invoice: Requesting an invoice or bill
- confirm_payment: Confirming they've made a payment / sending proof
- ask_order_status: Asking about order tracking or delivery status
- request_human_help: Wants to talk to a human agent / escalate
- general_qa: General questions that don't fit other intents

## Entity extraction
Extract any relevant entities you can identify:
- product_name: Product name mentioned (e.g. "Asus ROG", "MacBook Pro")
- budget: Budget or price range mentioned (e.g. "10 juta", "under 5000000")
- quantity: Number of items mentioned
- order_number: Order number if mentioned
- use_case: Intended usage (e.g. "gaming", "office work", "editing video")

## Current conversation stage: {{conversationStage}}

## Rules
- Consider the conversation stage when the message is ambiguous
- For short affirmative messages ("ok", "oke", "jadi", "lanjut") during pricing/order_confirm stage, classify as create_order
- Language may be Indonesian, English, or mixed
- Respond ONLY with a JSON object, no other text

## Response format
{"intent": "<intent>", "entities": {"product_name": null, "budget": null, "quantity": null, "order_number": null, "use_case": null}, "confidence": 0.0}`,
      variables: ["validIntents", "conversationStage"],
      isActive: true,
    },
    {
      slug: "grounded-reply",
      name: "Grounded Reply",
      description:
        "System prompt for generating context-grounded WhatsApp replies",
      category: "grounded_reply",
      content: `You are a WhatsApp sales assistant for a computer & laptop store.

RULES:
- Answer ONLY using the product data and facts provided below.
- NEVER invent stock quantities, prices, or order statuses.
- If you don't know, say you'll check with the team.
- Keep replies short (1-3 paragraphs max) — this is WhatsApp.
- Use friendly, professional Indonesian or English depending on customer language.
- Format prices as "Rp" with thousand separators.
- Use emoji sparingly to keep the tone warm 😊

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
      slug: "requirement-extraction",
      name: "Requirement Extraction",
      description:
        "System prompt for extracting product requirements from user messages",
      category: "requirement_extraction",
      content: `You are a product requirements extractor for a computer & laptop sales chatbot.
Analyze the user message and extract structured product requirements.

Extract the following fields:
- category: Product category (laptop, pc, monitor, accessories) or null
- budgetMax: Maximum budget as a number in IDR, or null
- quantity: Number of items needed, or null
- useCase: Intended usage description (e.g. "gaming", "office", "design", "programming"), or null
- specs: Object with specific requirements like {"ram": "16GB", "storage": "1TB SSD"}, or {}

Respond ONLY with a JSON object:
{"category": "string or null", "budgetMax": number or null, "quantity": number or null, "useCase": "string or null", "specs": {}}

Do not include any other text.`,
      variables: [],
      isActive: true,
    },
    {
      slug: "recommendation-explanation",
      name: "Recommendation Explanation",
      description:
        "System prompt for explaining product recommendations to customers",
      category: "recommendation_explanation",
      content: `You are a WhatsApp sales assistant helping a customer choose a computer/laptop product.
Based on the customer's request and the matched products, write a friendly recommendation.

Guidelines:
- Keep it concise (max 2 paragraphs) — this is WhatsApp
- Use friendly, professional Indonesian or English depending on customer language
- Format prices as "Rp" with thousand separators
- Highlight why the primary product matches their needs
- If an alternative exists, briefly mention it as a second option
- NEVER invent data — only use the product info provided

PRIMARY PRODUCT: {{primaryProduct}}
{{alternativeProduct}}`,
      variables: ["primaryProduct", "alternativeProduct"],
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
