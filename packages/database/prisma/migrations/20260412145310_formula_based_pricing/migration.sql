-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_cardboardProductId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "boxType" TEXT,
ADD COLUMN     "lebar" DOUBLE PRECISION,
ADD COLUMN     "material" TEXT,
ADD COLUMN     "panjang" DOUBLE PRECISION,
ADD COLUMN     "tinggi" DOUBLE PRECISION,
ALTER COLUMN "cardboardProductId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cardboardProductId_fkey" FOREIGN KEY ("cardboardProductId") REFERENCES "CardboardProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
