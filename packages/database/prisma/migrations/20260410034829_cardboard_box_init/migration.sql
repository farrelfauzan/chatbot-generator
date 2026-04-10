/*
  Warnings:

  - You are about to drop the column `productId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cardboardProductId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentGatewayId" TEXT,
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "sablonSides" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sablonTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "productId",
ADD COLUMN     "cardboardProductId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductVariant";

-- CreateTable
CREATE TABLE "CardboardProduct" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "panjang" DOUBLE PRECISION NOT NULL,
    "lebar" DOUBLE PRECISION NOT NULL,
    "tinggi" DOUBLE PRECISION NOT NULL,
    "surfaceArea" DOUBLE PRECISION,
    "material" TEXT NOT NULL,
    "pricePerPcs" DECIMAL(12,2) NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "isReadyStock" BOOLEAN NOT NULL DEFAULT false,
    "leadTimeDays" INTEGER,
    "imageUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardboardProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SablonOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sidesCount" INTEGER NOT NULL,
    "pricePerSide" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SablonOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogImage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardboardProduct_sku_key" ON "CardboardProduct"("sku");

-- CreateIndex
CREATE INDEX "CardboardProduct_type_idx" ON "CardboardProduct"("type");

-- CreateIndex
CREATE INDEX "CardboardProduct_material_idx" ON "CardboardProduct"("material");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cardboardProductId_fkey" FOREIGN KEY ("cardboardProductId") REFERENCES "CardboardProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
