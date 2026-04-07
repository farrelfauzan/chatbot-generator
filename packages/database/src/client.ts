import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Load environment variables before creating PrismaClient.",
    );
  }

  return databaseUrl;
}

export function createPrismaClient(databaseUrl = getDatabaseUrl()) {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __chatbotPrisma__: ReturnType<typeof createPrismaClient> | undefined;
}

export const prisma = globalThis.__chatbotPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__chatbotPrisma__ = prisma;
}
