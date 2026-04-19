-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- DropForeignKey (if exists)
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_cardboardProductId_fkey";

-- AlterTable: Remove cardboardProductId, add box spec columns
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "cardboardProductId",
ADD COLUMN IF NOT EXISTS "boxType" TEXT,
ADD COLUMN IF NOT EXISTS "material" TEXT,
ADD COLUMN IF NOT EXISTS "panjang" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "lebar" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tinggi" DOUBLE PRECISION;

-- DropTable
DROP TABLE IF EXISTS "BankAccount";
DROP TABLE IF EXISTS "CardboardProduct";
DROP TABLE IF EXISTS "SablonOption";
DROP TABLE IF EXISTS "Quote";
DROP TABLE IF EXISTS "Invoice";
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "RecommendationSession";

-- AlterTable: Add embedding to FaqEntry
ALTER TABLE "FaqEntry" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- CreateTable: KnowledgeChunk
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_sourceType_idx" ON "KnowledgeChunk"("sourceType");
