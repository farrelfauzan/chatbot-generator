import "dotenv/config";
import { createPrismaClient } from "../src/client";
import { hashSync } from "bcrypt";

const prisma = createPrismaClient();

export async function seed() {
  console.log("🌱 Seeding Wulan AI database...");

  // ─── Admin Account ─────────────────────────────────

  const adminEmail = "admin@wulan.ai";
  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: hashSync("admin123", 10),
      name: "Admin Wulan",
      role: "admin",
      isActive: true,
    },
    update: {},
  });

  console.log(`  ✅ Admin seeded (${adminEmail} / admin123)`);

  // ─── Company Info ──────────────────────────────────

  const companyInfoData = [
    { key: "name", value: "Wulan AI" },
    { key: "phone", value: "6287822992838" },
    { key: "email", value: "support@wulan.ai" },
    {
      key: "description",
      value:
        "Wulan AI — Asisten pribadi Muslim di WhatsApp. Pengingat shalat, memo cerdas, wawasan Islami, dan banyak lagi.",
    },
    {
      key: "cs_phone",
      value: "6287822992838",
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

  // ─── Bot Config ────────────────────────────────────

  const botConfigs = [
    {
      key: "bot_name",
      value: JSON.stringify("Wulan"),
    },
    {
      key: "bot_persona",
      value: JSON.stringify("Muslim personal assistant"),
    },
    {
      key: "default_timezone",
      value: JSON.stringify("Asia/Jakarta"),
    },
    {
      key: "prayer_method",
      value: JSON.stringify(20), // Kemenag Indonesia
    },
    {
      key: "daily_quote_time",
      value: JSON.stringify("06:00"),
    },
  ];

  for (const config of botConfigs) {
    const existing = await prisma.botConfig.findUnique({
      where: { key: config.key },
    });
    if (!existing) {
      await prisma.botConfig.create({
        data: { key: config.key, value: JSON.parse(config.value) },
      });
    }
  }

  console.log(`  ✅ ${botConfigs.length} bot configs seeded`);

  // ─── Daily Quotes ──────────────────────────────────

  const quotes = [
    {
      content:
        "Sesungguhnya sesudah kesulitan itu ada kemudahan. (QS. Al-Insyirah: 6)",
      source: "Al-Quran",
      category: "islamic",
    },
    {
      content:
        "Barangsiapa bertawakal kepada Allah, niscaya Allah akan mencukupkan keperluannya. (QS. At-Talaq: 3)",
      source: "Al-Quran",
      category: "islamic",
    },
    {
      content:
        "Dan mohonlah pertolongan (kepada Allah) dengan sabar dan shalat. (QS. Al-Baqarah: 45)",
      source: "Al-Quran",
      category: "islamic",
    },
    {
      content:
        "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain. (HR. Ahmad)",
      source: "Hadits",
      category: "islamic",
    },
    {
      content: "Tersenyum di hadapan saudaramu adalah sedekah. (HR. Tirmidzi)",
      source: "Hadits",
      category: "islamic",
    },
    {
      content:
        "Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah mudahkan baginya jalan menuju surga. (HR. Muslim)",
      source: "Hadits",
      category: "islamic",
    },
    {
      content:
        "Tidaklah seorang muslim ditimpa suatu kelelahan, penyakit, kesusahan, kesedihan, gangguan, maupun duka, sampai duri yang menusuknya, melainkan Allah mengampuni sebagian dosa-dosanya karenanya. (HR. Bukhari)",
      source: "Hadits",
      category: "islamic",
    },
    {
      content: "Doa adalah senjata orang beriman. (HR. Al-Hakim)",
      source: "Hadits",
      category: "islamic",
    },
    {
      content:
        "Jangan melihat kecilnya dosa, tapi lihatlah kepada siapa engkau bermaksiat. — Bilal bin Sa'd",
      source: "Atsar",
      category: "islamic",
    },
    {
      content:
        "Waktu bagaikan pedang. Jika engkau tidak memanfaatkannya, maka ia akan memotongmu. — Imam Syafi'i",
      source: "Ulama",
      category: "islamic",
    },
    {
      content:
        "Ilmu itu lebih baik dari harta. Ilmu menjagamu sedangkan kamu menjaga harta. — Ali bin Abi Thalib",
      source: "Sahabat",
      category: "islamic",
    },
    {
      content:
        "Mulailah dari tempatmu berdiri. Gunakan apa yang kamu punya. Lakukan apa yang kamu bisa.",
      source: "Arthur Ashe",
      category: "motivational",
    },
    {
      content:
        "Kesuksesan bukanlah final, kegagalan bukanlah fatal. Yang terpenting adalah keberanian untuk terus melangkah.",
      source: "Winston Churchill",
      category: "motivational",
    },
    {
      content:
        "Setiap hari adalah kesempatan baru untuk menjadi versi terbaik dari dirimu.",
      source: "Unknown",
      category: "motivational",
    },
    {
      content: "Fokus pada progress, bukan perfection.",
      source: "Unknown",
      category: "productivity",
    },
    {
      content:
        "Produktivitas bukan tentang melakukan lebih banyak, tapi tentang melakukan yang tepat.",
      source: "Unknown",
      category: "productivity",
    },
  ];

  let quotesCreated = 0;
  for (const quote of quotes) {
    const exists = await prisma.dailyQuote.findFirst({
      where: { content: quote.content },
    });
    if (!exists) {
      await prisma.dailyQuote.create({ data: quote });
      quotesCreated++;
    }
  }

  console.log(`  ✅ ${quotesCreated} daily quotes seeded`);

  console.log("\n✨ Wulan AI seed complete!");
}

async function main() {
  await seed();
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
