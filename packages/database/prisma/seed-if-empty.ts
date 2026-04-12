import "dotenv/config";
import { createPrismaClient } from "../src/client";
import { seed } from "./seed";

const prisma = createPrismaClient();

async function main() {
  const adminCount = await prisma.admin.count();
  if (adminCount > 0) {
    console.log("⏭️  Database already seeded, skipping.");
    return;
  }

  console.log("🌱 First run detected — running seed...");
  await seed();
}

main()
  .catch((e) => {
    console.error("Seed-if-empty check failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
