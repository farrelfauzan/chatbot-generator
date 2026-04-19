/**
 * Seed knowledge chunks for RAG.
 *
 * Usage:
 *   npx tsx packages/database/prisma/seed-knowledge.ts
 *
 * Requires LLM_API_KEY and DATABASE_URL env vars.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/client";
import OpenAI from "openai";

const prisma = createPrismaClient();

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

const EMBEDDING_MODEL = "text-embedding-3-small";

// ─── Knowledge Chunks ─────────────────────────────────

const KNOWLEDGE_CHUNKS = [
  // ─── Pricing ──────────────────────────────────────
  {
    sourceType: "pricing",
    title: "Pricing: Dus Indomie (RSC) Singlewall",
    content:
      "Harga dus indomie (RSC) material singlewall dihitung dari luas permukaan: 2×(P×L + P×T + L×T) cm². Rate: Rp 1.3523 per cm² (714/528). Hasil dibulatkan ke atas kelipatan Rp 100.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Dus Indomie (RSC) C-Flute",
    content:
      "Harga dus indomie (RSC) material C-Flute dihitung dari luas permukaan: 2×(P×L + P×T + L×T) cm². Rate: Rp 1.5909 per cm² (840/528). Hasil dibulatkan ke atas kelipatan Rp 100.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Dus Indomie (RSC) Doublewall",
    content:
      "Harga dus indomie (RSC) material doublewall dihitung dari luas permukaan: 2×(P×L + P×T + L×T) cm². Rate: Rp 2.3277 per cm² (1229/528). Hasil dibulatkan ke atas kelipatan Rp 100.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Dus Pizza (Die-Cut)",
    content:
      "Harga dus pizza (die-cut): Sheet Width = P + 2T + 5, Sheet Height = P + L + 2T + 2. Sheet Area = Width × Height. Harga = Sheet Area × Rp 1.1. Dibulatkan ke atas kelipatan Rp 100.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Sablon",
    content:
      "Biaya sablon (cetak logo/tulisan di permukaan dus) sebesar Rp 500 per sisi. Bisa 1 sampai 4 sisi. Total sablon = jumlah sisi × 500 × quantity.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Minimum Order Sablon",
    content:
      "Minimal order untuk sablon: 200 pcs atau total Rp 300.000, mana yang tercapai duluan. Jika customer mau sablon tapi quantity di bawah 200 pcs, infokan minimal sablon 200 pcs.",
  },
  {
    sourceType: "pricing",
    title: "Pricing: Grand Total Calculation",
    content:
      "Total harga = (harga per pcs + sablon per pcs) × quantity. Belum termasuk ongkos kirim. Harga per pcs dihitung dari formula berdasarkan tipe dus, ukuran, dan material.",
  },

  // ─── Bot Behaviour ────────────────────────────────
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Greeting Flow",
    content:
      'Saat customer pertama kali chat, sapa dengan ramah, kirim foto katalog (call send_catalog_images), dan tanyakan jenis dus yang dibutuhkan. Gunakan panggilan "kakak" jika nama belum diketahui.',
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Box Types Available",
    content:
      "Dua jenis dus tersedia: 1) Dus Indomie (RSC) — dus standar untuk pengiriman, berbentuk kotak biasa. 2) Dus Pizza (Die-Cut) — dus untuk makanan, berbentuk pipih dengan tutup terbuka.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Materials Available",
    content:
      "Tiga pilihan material: 1) Singlewall — tipis, ringan, cocok untuk barang ringan. 2) C-Flute — ketebalan medium, paling populer, cocok untuk kebanyakan kebutuhan. 3) Doublewall — paling tebal dan kuat, cocok untuk barang berat.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Order Flow",
    content:
      "Alur order 12 langkah: 1) Greeting, 2) Tanya jenis dus, 3) Tanya ukuran (P×L×T), 4) Tanya material, 5) Tanya quantity, 6) Tanya sablon (opsional), 7) Hitung harga (calculate_price), 8) Tambah ke cart (add_to_cart), 9) Tanya mau tambah item lagi?, 10) Tampilkan ringkasan cart (view_cart), 11) Konfirmasi order (confirm_order), 12) Kirim link pembayaran.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Cart Rules",
    content:
      "Customer bisa menambahkan beberapa item ke cart. Tampilkan ringkasan cart sebelum konfirmasi. Customer bisa edit quantity, material, atau sablon dengan update_cart_item. Jangan tambah duplikat — gunakan update jika item sudah ada.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Payment Rules",
    content:
      "Pembayaran hanya melalui DOKU payment link. Link dikirim otomatis saat order dikonfirmasi (confirm_order). Jika customer minta link lagi, gunakan get_payment_info untuk mengirim ulang.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Delivery Policy",
    content:
      "Pengiriman area Jabodetabek 2-3 hari kerja. Luar Jabodetabek 3-5 hari kerja. Ongkos kirim dihitung terpisah dan belum termasuk dalam harga dus. Bisa juga diambil langsung (COD).",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Location",
    content:
      "Workshop berlokasi di area Jabodetabek. Customer bisa datang langsung untuk mengambil pesanan (COD) atau memilih dikirim.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Out of Scope",
    content:
      'Jika customer menanyakan sesuatu di luar kemampuan bot (bukan tentang harga, ukuran, order, pembayaran, pengiriman, sablon, atau produk kardus), jawab: "Kita diskusikan dulu dengan tim ya kak, nanti kami hubungi kembali 😊"',
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Cancellation",
    content:
      "Customer bisa membatalkan order sebelum bayar dengan menggunakan cancel_order. Setelah pembayaran, customer perlu menghubungi admin untuk proses pembatalan.",
  },
  {
    sourceType: "bot_behavior",
    title: "Bot Behaviour: Formatting",
    content:
      'Gunakan format WhatsApp: *bold* untuk penekanan, numbered list untuk opsi. Jaga reply tetap singkat (maksimal 1-3 paragraf). Format harga sebagai "Rp" dengan pemisah ribuan.',
  },
];

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.substring(0, 8000)),
  });
  return response.data.map((d) => d.embedding);
}

async function main() {
  console.log("🧠 Seeding knowledge chunks for RAG...\n");

  // ─── Seed Knowledge Chunks ─────────────────────────

  const texts = KNOWLEDGE_CHUNKS.map((c) => `${c.title} ${c.content}`);
  console.log(`Generating embeddings for ${texts.length} chunks...`);
  const vectors = await embedBatch(texts);

  for (let i = 0; i < KNOWLEDGE_CHUNKS.length; i++) {
    const chunk = KNOWLEDGE_CHUNKS[i];
    const embeddingStr = `[${vectors[i].join(",")}]`;

    // Upsert by sourceType + title
    const existing = await prisma.knowledgeChunk.findFirst({
      where: { sourceType: chunk.sourceType, title: chunk.title },
    });

    if (existing) {
      await prisma.knowledgeChunk.update({
        where: { id: existing.id },
        data: { content: chunk.content },
      });
      await prisma.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${existing.id}`;
      console.log(`  ✏️  Updated: ${chunk.title}`);
    } else {
      const created = await prisma.knowledgeChunk.create({
        data: {
          sourceType: chunk.sourceType,
          title: chunk.title,
          content: chunk.content,
          metadata: {},
        },
      });
      await prisma.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${created.id}`;
      console.log(`  ✅ Created: ${chunk.title}`);
    }
  }

  // ─── Embed FAQ Entries ─────────────────────────────

  const faqEntries = await prisma.faqEntry.findMany({
    where: { isActive: true },
  });

  if (faqEntries.length > 0) {
    console.log(
      `\nGenerating embeddings for ${faqEntries.length} FAQ entries...`,
    );
    const faqTexts = faqEntries.map((e) => `${e.question} ${e.answer}`);
    const faqVectors = await embedBatch(faqTexts);

    for (let i = 0; i < faqEntries.length; i++) {
      const embeddingStr = `[${faqVectors[i].join(",")}]`;
      await prisma.$executeRaw`UPDATE "FaqEntry" SET embedding = ${embeddingStr}::vector WHERE id = ${faqEntries[i].id}`;

      // Also create KnowledgeChunk for FAQ
      const existing = await prisma.knowledgeChunk.findFirst({
        where: { sourceType: "faq", sourceId: faqEntries[i].id },
      });

      const faqData = {
        sourceType: "faq",
        sourceId: faqEntries[i].id,
        title: faqEntries[i].question,
        content: `Q: ${faqEntries[i].question}\nA: ${faqEntries[i].answer}`,
        metadata: { category: faqEntries[i].category },
      };

      if (existing) {
        await prisma.knowledgeChunk.update({
          where: { id: existing.id },
          data: faqData,
        });
        await prisma.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${existing.id}`;
      } else {
        const created = await prisma.knowledgeChunk.create({ data: faqData });
        await prisma.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${created.id}`;
      }

      console.log(`  ✅ FAQ: ${faqEntries[i].question.substring(0, 50)}...`);
    }
  }

  console.log("\n🎉 Knowledge seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
