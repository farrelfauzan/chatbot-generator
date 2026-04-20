/**
 * Seed knowledge chunks for RAG.
 *
 * Usage:
 *   npx tsx packages/database/prisma/seed-knowledge.ts
 *
 * Requires LLM_API_KEY and DATABASE_URL env vars.
 *
 * This script OVERRIDES all existing KnowledgeChunk rows:
 *   1. Deletes every KnowledgeChunk that is NOT in the seed list.
 *   2. Upserts every chunk from the seed list (by sourceType + title).
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
  // ─── Pricing Formulas ─────────────────────────────
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

  // ─── Business Settings ────────────────────────────
  {
    sourceType: "business_info",
    title: "Business: Nama Bisnis",
    content: "Nama bisnis: Mader Packer.",
  },
  {
    sourceType: "business_info",
    title: "Business: Lokasi Gudang / Pickup",
    content:
      "Lokasi gudang / pickup: Kapuk, Jakarta Barat. Google Maps: https://share.google/FntO8r2jdTPAnMoUL. Customer bisa datang langsung untuk ambil sendiri (pickup/COD).",
  },
  {
    sourceType: "business_info",
    title: "Business: Link Katalog",
    content:
      "Link katalog / Google Drive: https://drive.google.com/drive/folders/13zyGJgLJOaCCWGso_Dsh9UhIqsimw-Qq?usp=drive_link",
  },
  {
    sourceType: "business_info",
    title: "Business: Jam Operasional",
    content:
      "Jam operasional: Senin-Sabtu 08.00-17.00, Minggu 09.00-12.00. Chat di luar jam tetap diterima dan akan dibalas saat jam kerja.",
  },
  {
    sourceType: "business_info",
    title: "Business: Area Free Delivery",
    content:
      "Area free delivery: Jakarta minimal order Rp 300rb gratis ongkir. Bodetabek minimal order Rp 3jt gratis ongkir (selain itu flat rate Rp 100rb). Luar dari itu pengiriman cargo as request atau bila urgent bisa lalamove/pickup sendiri (biaya tidak ditanggung). Jadwal pengantaran sesuai availability supir & kurir, akan diinfokan oleh tim pengiriman.",
  },
  {
    sourceType: "business_info",
    title: "Business: Area Kirim Luar Kota",
    content:
      "Pengiriman luar kota menggunakan jasa cargo sesuai rate cargo yang dipilih, biasa pakai HPM/Central. Dihitung berdasarkan total berat, ukuran, & quantity.",
  },
  {
    sourceType: "business_info",
    title: "Business: Metode Pembayaran",
    content:
      "Metode pembayaran: DOKU. Wajib full payment sebelum proses produksi. Bisa bayar via QRIS, e-wallet, atau kartu kredit melalui link pembayaran DOKU.",
  },
  {
    sourceType: "business_info",
    title: "Business: Lead Time Ready Stock",
    content:
      "Lead time ready stock: 1-3 hari kerja (dihitung sejak data final + pembayaran sesuai ketentuan).",
  },
  {
    sourceType: "business_info",
    title: "Business: Lead Time Custom + Print",
    content:
      "Lead time custom + print (sablon): 5-7 hari kerja (dihitung sejak data final + pembayaran sesuai ketentuan).",
  },
  {
    sourceType: "business_info",
    title: "Business: MOQ",
    content:
      "Minimal pemesanan (MOQ): Rp 300.000. Jika total pesanan di bawah Rp 300.000, infokan ke customer.",
  },
  {
    sourceType: "business_info",
    title: "Business: Biaya & MOQ Sablon",
    content:
      "Biaya sablon: Rp 500/sisi/warna (cek design). MOQ sablon 200 pcs karena harus bikin papan baru. Jika lebih dari 1 warna, kena tambahan @Rp 500/warna/sisi. Rekomendasikan 1 warna, selebihnya bisa di cek terlebih dahulu tergantung design.",
  },
  {
    sourceType: "business_info",
    title: "Business: Ketentuan Revisi / Complaint",
    content:
      "Setelah ukuran, design, dan quantity telah disetujui oleh customer dan invoice telah terbit, tidak boleh ada pergantian lagi karena barang sudah langsung diproduksi.",
  },
  {
    sourceType: "business_info",
    title: "Business: PIC Eskalasi Urgent",
    content:
      "Jika ada kebutuhan eskalasi urgent atau pertanyaan yang tidak bisa dijawab bot, hubungi PIC di 6282299998827.",
  },

  // ─── Standard Disclaimers ─────────────────────────
  {
    sourceType: "policy",
    title: "Policy: Full Payment",
    content:
      "Wajib menerima full payment sebelum proses produksi. Berlaku untuk semua order tanpa terkecuali.",
  },

  // ─── FAQ Database ─────────────────────────────────
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Jual box apa saja?",
    content:
      'Q: Kak ini jual box apa saja?\nA: Kami melayani corrugated / kardus coklat, dan kebutuhan custom ukuran sesuai produk kak.\nData yang perlu dikonfirmasi: Jenis produk yang dicari.\nEskalasi: Produk di luar scope → push back. Selain corrugated → "maaf kak, belum ada".',
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bahannya apa?",
    content:
      'Q: Bahannya apa?\nA: Untuk corrugated box, kami tersedia beberapa ukuran dengan model Indomie / Pizza. Bahan k150 m125 k150.\nData yang perlu dikonfirmasi: Jenis bahan yang dipilih.\nEskalasi: Butuh material khusus selain ini → push back. Selain material ini → "maaf kak, belum ada".',
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Apakah food grade?",
    content:
      "Q: Apakah food grade?\nA: Untuk bahan corrugated kami belum termasuk kategori food grade. Namun banyak customer tetap menggunakan untuk makanan kering / berlapis (seperti pakai plastik atau kertas food wrap di dalamnya). Dari sisi produksi, kami tetap menjaga kebersihan (penyimpanan bahan & proses kerja).\nData yang perlu dikonfirmasi: Jenis isi produk.\nEskalasi: Kontak langsung dengan makanan sensitif → push back.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Ada ukuran berapa?",
    content:
      "Q: Ada ukuran berapa?\nA: Tersedia ukuran ready stock 1000++ lebih kak, dan bisa custom menyesuaikan kebutuhan dalam batas produksi. Kakak lagi cari ukuran apakah? Format penulisan P x L x T dalam CENTIMETER.\nData yang perlu dikonfirmasi: P x L x T (cm).\nEskalasi: Ukuran terlalu besar/kecil → push back.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Belum tahu ukurannya",
    content:
      'Q: Saya belum tahu ukurannya\nA: Bisa kak, kirim ukuran produk yang mau dimasukkan + patokan ukuran, nanti kami bantu rekomendasikan.\nData yang perlu dikonfirmasi: Foto produk / dimensi isi / berat produk.\nEskalasi: Produk bentuk tidak standar → push back. Selain bentuk pizza/indomie → "maaf kak, belum ada".',
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Kuat untuk berapa kg?",
    content:
      "Q: Kuat untuk berapa kg?\nA: Daya tahan bergantung bahan, flute/ketebalan, ukuran box, dan isi produk. Sebutkan isi & estimasi beratnya ya kak.\nData yang perlu dikonfirmasi: Berat isi + cara susun.\nEskalasi: Barang berat/fragile → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Minimal order berapa?",
    content:
      "Q: Minimal order berapa?\nA: MOQ berbeda untuk ready stock dan custom + print. Kami info sesuai tipe order kak.\nData yang perlu dikonfirmasi: Jenis order.\nEskalasi: Qty di bawah MOQ tapi tetap diminta → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa sample?",
    content:
      "Q: Bisa sample?\nA: Ketersediaan sample tergantung jenis produk dan stok. Info produk yang ingin dicek ya kak. Sample gratis, pickup sendiri di pabrik.\nData yang perlu dikonfirmasi: Jenis sample & alamat.\nEskalasi: Sample mendesak → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa sablon logo?",
    content:
      "Q: Bisa sablon logo?\nA: Bisa kak, tersedia opsi print/sablon sesuai jenis produk. Mohon kirim logo/desain agar dicek ya. Sablon only, jadi rekomendasi 1 warna.\nData yang perlu dikonfirmasi: Desain, jumlah warna, area print.\nEskalasi: Cek design → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Format file apa?",
    content:
      "Q: Format file apa?\nA: Idealnya file vector / PDF / AI / CDR / high-res agar hasil sablon lebih presisi. Tapi kirim gambar WhatsApp juga bisa.\nData yang perlu dikonfirmasi: File final desain.\nEskalasi: File rendah resolusi → note.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Harganya berapa?",
    content:
      "Q: Harganya berapa?\nA: Harga mengikuti ukuran, bahan, qty, dan total sisi sablon. Jika detail belum lengkap kami berikan range dulu ya kak.\nData yang perlu dikonfirmasi: Ukuran, qty, print, delivery area.\nEskalasi: Minta harga tanpa spesifikasi → push back, minta detail dulu.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Ada harga grosir?",
    content:
      "Q: Ada harga grosir?\nA: Ada penyesuaian harga untuk qty tertentu. Kirim kebutuhan qty kak ya supaya kami hitungkan opsi terbaik.\nData yang perlu dikonfirmasi: Qty target.\nEskalasi: Negosiasi besar → escalate ke manual agent.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Berapa lama jadi?",
    content:
      "Q: Berapa lama jadi?\nA: Proses produksi tergantung ready stock dan antrian saat ini ya kak dan dihitung sejak data final + pembayaran sesuai ketentuan kami.\nData yang perlu dikonfirmasi: Deadline pakai.\nEskalasi: Deadline mepet → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa cepat? (Urgent)",
    content:
      "Q: Bisa cepat?\nA: Bisa dibantu cekkan dulu kak. Tolong info produk, qty, ukuran, sablon/tidak, dan deadline pastinya ya.\nData yang perlu dikonfirmasi: Deadline pasti.\nEskalasi: Deadline < SLA normal → escalate. Mau kirim hari ini → cek stok barang dulu.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bayarnya bagaimana?",
    content:
      "Q: Bayarnya bagaimana?\nA: Pembayaran mengikuti kebijakan order. Wajib full payment sebelum produksi. Metode bayar tersedia di invoice / konfirmasi admin.\nData yang perlu dikonfirmasi: Tipe order & nominal.\nEskalasi: Minta termin khusus → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa invoice / kwitansi?",
    content:
      "Q: Bisa invoice / kwitansi?\nA: Bisa kak, kami siapkan invoice setelah detail pesanan fix.\nData yang perlu dikonfirmasi: Data invoice.\nEskalasi: Butuh NPWP / format khusus → escalate (butuh invoice accurate).",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa kirim ke mana?",
    content:
      "Q: Bisa kirim ke mana?\nA: Bisa kirim area tertentu via kurir/cargo/pickup. Kirim kecamatan/kota supaya kami cekkan opsi kirim paling pas.\nData yang perlu dikonfirmasi: Alamat lengkap.\nEskalasi: Area sulit dijangkau → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Ongkir berapa?",
    content:
      "Q: Ongkir berapa?\nA: Ongkir menyesuaikan alamat, berat/volume, dan metode kirim. Share alamat lengkap ya kak.\nData yang perlu dikonfirmasi: Alamat lengkap.\nEskalasi: Alamat belum jelas → push back, minta alamat dulu.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa ambil sendiri? (Pickup)",
    content:
      "Q: Bisa ambil sendiri?\nA: Bisa kak, pickup dari Kapuk, Jakarta Barat sesuai jam operasional (Senin-Sabtu 08.00-17.00, Minggu 09.00-12.00).\nData yang perlu dikonfirmasi: Nama pengambil + waktu.\nEskalasi: Minta pickup di luar jam → push back.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Kalau ada masalah bagaimana? (Complaint)",
    content:
      "Q: Kalau ada masalah bagaimana?\nA: Silakan kirim foto/video, jumlah item terdampak, dan kronologi singkat. Kami cek dulu dan update solusi secepatnya.\nData yang perlu dikonfirmasi: Foto/video, qty issue, kronologi.\nEskalasi: Komplain besar / potensi refund → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa cancel?",
    content:
      "Q: Bisa cancel?\nA: Pembatalan mengikuti status order saat ini. Jika produksi sudah berjalan, pembatalan / perubahan bisa terbatas.\nData yang perlu dikonfirmasi: Status order.\nEskalasi: Order sudah produksi → escalate.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa order ulang yang sama? (Repeat Order)",
    content:
      "Q: Bisa order ulang yang sama?\nA: Bisa kak, kirim invoice lama / foto produk sebelumnya / spesifikasi lama, nanti kami bantu cekkan cepat.\nData yang perlu dikonfirmasi: Referensi order lama.\nEskalasi: File lama hilang → note.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Ada katalog?",
    content:
      "Q: Ada katalog?\nA: Ada kak, bisa kami kirim katalog / contoh produk. Info dulu produk yang dicari supaya kami kirim yang relevan.\nData yang perlu dikonfirmasi: Jenis produk.\nEskalasi: Katalog belum update → note.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Balas sampai jam berapa? (Business Hours)",
    content:
      "Q: Balas sampai jam berapa?\nA: Jam operasional kami Senin-Sabtu 08.00-17.00, Minggu 09.00-12.00. Chat di luar jam tetap kami terima dan akan dibalas saat jam kerja.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Ada jasa free design?",
    content:
      "Q: Ada jasa free design?\nA: Ada kak, kami menyediakan jasa design untuk pembuatan design packaging untuk keperluan sablon. Free revisi sampai kakak puas. Proses pengerjaan design 3 hari kerja.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Proses free design",
    content:
      "Q: Proses free design bagaimana?\nA: Untuk free design wajib menyelesaikan pembayaran terlebih dahulu ya kak agar bisa kami proses ke tim designer. Proses pengerjaan design 3 hari kerja.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Bisa pickup sampai jam berapa?",
    content:
      "Q: Bisa pickup sampai jam berapa?\nA: Jam operasional kami Senin-Sabtu 08.00-17.00, Minggu 09.00-12.00.",
  },
  // ─── Escalation / Admin ─────────────────────────
  {
    sourceType: "policy",
    title: "Policy: Kapan harus hubungkan ke admin",
    content:
      "Customer harus dihubungkan ke admin/CS jika: (1) Customer secara eksplisit minta bicara admin/CS/manusia, (2) Customer komplain dan tidak puas dengan jawaban bot, (3) Customer marah atau frustasi, (4) Pertanyaan tentang status pengiriman detail yang tidak ada di sistem. Gunakan tool escalate_to_admin dengan alasan yang jelas.",
  },
  {
    sourceType: "faq_knowledge",
    title: "FAQ: Diskon dan Promo",
    content:
      "Q: Ada diskon/promo?\nA: Untuk saat ini belum ada promo khusus kak. Tapi untuk pemesanan dalam jumlah besar (di atas 1000 pcs), bisa diskusikan langsung dengan tim kami untuk harga spesial ya. Silakan hubungi admin untuk negosiasi.",
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

  // ─── Step 1: Wipe ALL existing KnowledgeChunk rows ──
  const deleted = await prisma.knowledgeChunk.deleteMany();
  console.log(`🗑️  Deleted ${deleted.count} existing knowledge chunks.\n`);

  // ─── Step 2: Generate embeddings ───────────────────
  const texts = KNOWLEDGE_CHUNKS.map((c) => `${c.title} ${c.content}`);
  console.log(`Generating embeddings for ${texts.length} chunks...`);
  const vectors = await embedBatch(texts);

  // ─── Step 3: Insert all chunks fresh ───────────────
  for (let i = 0; i < KNOWLEDGE_CHUNKS.length; i++) {
    const chunk = KNOWLEDGE_CHUNKS[i];
    const embeddingStr = `[${vectors[i].join(",")}]`;

    const created = await prisma.knowledgeChunk.create({
      data: {
        sourceType: chunk.sourceType,
        title: chunk.title,
        content: chunk.content,
        metadata: {},
      },
    });
    await prisma.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${created.id}`;
    console.log(`  ✅ ${chunk.title}`);
  }

  // ─── Step 4: Embed FAQ Entries ─────────────────────
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
      console.log(`  ✅ FAQ: ${faqEntries[i].question.substring(0, 50)}...`);
    }
  }

  console.log(
    `\n🎉 Knowledge seeding complete! ${KNOWLEDGE_CHUNKS.length} chunks inserted.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
