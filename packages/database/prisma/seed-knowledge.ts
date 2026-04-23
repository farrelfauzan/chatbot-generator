import "dotenv/config";
import OpenAI from "openai";
import { createPrismaClient } from "../src/client";

const prisma = createPrismaClient();

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "",
  baseURL: process.env.LLM_BASE_URL || "https://ai.sumopod.com/v1",
});

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000),
  });
  return res.data[0].embedding;
}

async function main() {
  if (!process.env.LLM_API_KEY) {
    console.error(
      "❌ LLM_API_KEY is required to generate embeddings. Set it in apps/api/.env or as env var.",
    );
    process.exit(1);
  }
  console.log("🌱 Seeding Wulan AI knowledge base (with embeddings)...");

  const chunks = [
    // ─── Wulan AI Info ───────────────────────────────
    {
      sourceType: "bot_behavior",
      title: "Tentang Wulan AI",
      content:
        "Wulan AI adalah asisten pribadi Muslim di WhatsApp. Wulan membantu pengingat shalat, memo cerdas, penjadwalan pesan, wawasan Islami, dan quotes harian. Wulan menggunakan bahasa Indonesia yang hangat dan sopan.",
    },
    {
      sourceType: "bot_behavior",
      title: "Fitur Wulan: Pengingat Shalat",
      content:
        "Wulan bisa mengingatkan waktu shalat 5 waktu (Subuh, Dzuhur, Ashar, Maghrib, Isya) berdasarkan lokasi kota pengguna. Waktu shalat dihitung menggunakan metode Kemenag Indonesia. Pengingat dikirim otomatis 2 menit sebelum waktu shalat.",
    },
    {
      sourceType: "bot_behavior",
      title: "Fitur Wulan: Memo Cerdas",
      content:
        'Wulan bisa menyimpan catatan/memo pengguna. Kata kunci: "catat", "simpan", "ingat", "note". Memo bisa dicari berdasarkan kata kunci (semantic search). Pengguna bisa lihat daftar, lihat detail, dan hapus memo.',
    },
    {
      sourceType: "bot_behavior",
      title: "Fitur Wulan: WhatsApp Scheduler",
      content:
        "Wulan bisa menjadwalkan pesan WhatsApp untuk dikirim di waktu tertentu. Default kirim ke nomor pengguna sendiri (sebagai reminder). Bisa juga kirim ke nomor lain. Pengguna bisa lihat daftar jadwal dan batalkan jadwal.",
    },
    {
      sourceType: "bot_behavior",
      title: "Fitur Wulan: Wawasan Islami",
      content:
        "Wulan bisa mencari ayat Al-Quran berdasarkan nama surah, nomor surah:ayat, atau kata kunci. Menampilkan teks Arab + terjemahan Indonesia. Wulan juga bisa menjawab pertanyaan umum tentang Islam dari knowledge base.",
    },
    {
      sourceType: "bot_behavior",
      title: "Fitur Wulan: Quotes Harian",
      content:
        "Wulan mengirim quotes/motivasi harian setiap pagi jam 06:00 WIB. Kategori: Islamic, motivational, productivity. Pengguna juga bisa meminta quotes kapan saja.",
    },

    // ─── Islamic Knowledge ───────────────────────────
    {
      sourceType: "faq",
      title: "Rukun Islam",
      content:
        "Rukun Islam ada 5: (1) Syahadat — bersaksi bahwa tiada Tuhan selain Allah dan Muhammad adalah utusan-Nya, (2) Shalat — mendirikan shalat 5 waktu, (3) Zakat — menunaikan zakat, (4) Puasa — berpuasa di bulan Ramadhan, (5) Haji — menunaikan haji bagi yang mampu.",
    },
    {
      sourceType: "faq",
      title: "Rukun Iman",
      content:
        "Rukun Iman ada 6: (1) Iman kepada Allah, (2) Iman kepada Malaikat-malaikat-Nya, (3) Iman kepada Kitab-kitab-Nya, (4) Iman kepada Rasul-rasul-Nya, (5) Iman kepada Hari Akhir, (6) Iman kepada Qada dan Qadar.",
    },
    {
      sourceType: "faq",
      title: "Waktu Shalat 5 Waktu",
      content:
        "Shalat 5 waktu wajib: (1) Subuh — dari terbit fajar sampai terbit matahari, 2 rakaat, (2) Dzuhur — setelah matahari tergelincir sampai bayangan sama panjang, 4 rakaat, (3) Ashar — setelah waktu Dzuhur sampai matahari menguning, 4 rakaat, (4) Maghrib — setelah matahari terbenam sampai hilang mega merah, 3 rakaat, (5) Isya — setelah hilang mega merah sampai terbit fajar, 4 rakaat.",
    },
    {
      sourceType: "faq",
      title: "Doa Sebelum Tidur",
      content:
        'Doa sebelum tidur: "Bismikallaahumma ahyaa wa amuut" (Dengan nama-Mu ya Allah aku hidup dan aku mati). Rasulullah SAW juga menganjurkan membaca Ayat Kursi (QS. Al-Baqarah: 255) dan 3 Qul (Al-Ikhlas, Al-Falaq, An-Nas) sebelum tidur.',
    },
    {
      sourceType: "faq",
      title: "Doa Sebelum Makan",
      content:
        'Doa sebelum makan: "Allaahumma baarik lanaa fiimaa razaqtanaa waqinaa \'adzaaban naar" (Ya Allah, berkahilah kami dalam rezeki yang Engkau berikan dan lindungilah kami dari siksa api neraka). Atau cukup: "Bismillah" (Dengan nama Allah).',
    },
    {
      sourceType: "faq",
      title: "Doa Sesudah Makan",
      content:
        "Doa sesudah makan: \"Alhamdulillaahil ladzii ath'amanaa wa saqaanaa wa ja'alanaa minal muslimiin\" (Segala puji bagi Allah yang telah memberi makan dan minum kepada kami dan menjadikan kami termasuk orang-orang Muslim).",
    },
    {
      sourceType: "faq",
      title: "Doa Keluar Rumah",
      content:
        'Doa keluar rumah: "Bismillaahi tawakkaltu \'alallahi walaa haula walaa quwwata illaa billaah" (Dengan nama Allah, aku bertawakal kepada Allah, tiada daya dan kekuatan kecuali dengan Allah). HR. Abu Dawud & Tirmidzi.',
    },
    {
      sourceType: "faq",
      title: "Shalat Tahajud",
      content:
        "Shalat Tahajud adalah shalat sunnah yang dikerjakan pada sepertiga malam terakhir. Minimal 2 rakaat, maksimal tidak dibatasi (biasanya 8 atau 12 rakaat). Ditutup dengan witir (1 atau 3 rakaat). Ini adalah shalat sunnah yang paling utama setelah shalat wajib. QS. Al-Isra: 79.",
    },
    {
      sourceType: "faq",
      title: "Istighfar dan Manfaatnya",
      content:
        'Istighfar (memohon ampun) sangat dianjurkan. Lafaznya: "Astaghfirullaahal \'adziim" atau "Astaghfirullaahal \'adziim al ladzii laa ilaaha illaa huwal hayyul qayyuum wa atuubu ilaihi". Manfaat: menghapus dosa, melapangkan rezeki, menghilangkan kesedihan. QS. Nuh: 10-12.',
    },
    {
      sourceType: "faq",
      title: "Sedekah dalam Islam",
      content:
        "Sedekah tidak hanya berupa harta. Rasulullah SAW bersabda: Senyummu kepada saudaramu adalah sedekah, menyuruh kebaikan dan mencegah kemungkaran adalah sedekah, menunjukkan jalan bagi orang yang tersesat adalah sedekah, menyingkirkan duri dan gangguan dari jalan adalah sedekah. HR. Tirmidzi.",
    },
    {
      sourceType: "faq",
      title: "Puasa Sunnah",
      content:
        "Puasa sunnah yang dianjurkan: (1) Senin-Kamis — puasa 2 hari setiap minggu, (2) Ayyamul Bidh — tanggal 13, 14, 15 setiap bulan Hijriah, (3) Puasa Daud — puasa selang-seling (sehari puasa, sehari tidak), (4) Puasa Syawal — 6 hari di bulan Syawal setelah Ramadhan, (5) Puasa Arafah — tanggal 9 Dzulhijjah (bagi yang tidak haji).",
    },

    // ─── Wulan Policies ──────────────────────────────
    {
      sourceType: "policy",
      title: "Batasan Wulan AI",
      content:
        "Wulan TIDAK memberikan fatwa hukum Islam yang detail atau kontroversial. Untuk pertanyaan fiqh yang kompleks, Wulan menyarankan untuk berkonsultasi dengan ustadz/ulama. Wulan tidak membahas politik, SARA, atau konten tidak pantas. Wulan selalu menjawab dengan sopan dan hangat.",
    },
    {
      sourceType: "policy",
      title: "Privasi dan Data Pengguna",
      content:
        "Wulan menyimpan data pengguna (nama, lokasi, memo, jadwal) hanya untuk keperluan fitur. Data tidak dibagikan ke pihak ketiga. Pengguna bisa meminta penghapusan data kapan saja dengan menghubungi admin.",
    },
    {
      sourceType: "policy",
      title: "Eskalasi ke Admin",
      content:
        "Wulan akan menyambungkan pengguna ke admin manusia jika: (1) Pengguna meminta bicara dengan admin, (2) Pertanyaan di luar kemampuan Wulan, (3) Ada keluhan atau masalah teknis, (4) Pertanyaan sensitif yang butuh penanganan manusia.",
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const chunk of chunks) {
    const exists = await prisma.knowledgeChunk.findFirst({
      where: { title: chunk.title, sourceType: chunk.sourceType },
    });
    if (exists) {
      skipped++;
      continue;
    }

    // Create the chunk first
    const record = await prisma.knowledgeChunk.create({ data: chunk });

    // Generate and store embedding
    try {
      const textToEmbed = `${chunk.title}: ${chunk.content}`;
      const embedding = await embedText(textToEmbed);
      const embeddingStr = `[${embedding.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "KnowledgeChunk" SET embedding = ${embeddingStr}::vector WHERE id = ${record.id}`;
      created++;
      console.log(`  ✅ [${created}/${chunks.length}] ${chunk.title}`);
    } catch (err) {
      console.warn(
        `  ⚠️  Embedded failed for "${chunk.title}": ${(err as Error).message}`,
      );
      created++;
    }
  }

  if (skipped > 0) console.log(`  ⏭️  ${skipped} chunks already existed`);
  console.log(`  ✅ ${created} knowledge chunks seeded with embeddings`);
  console.log("\n✨ Knowledge base seed complete!");
}

main()
  .catch((e) => {
    console.error("Knowledge seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
