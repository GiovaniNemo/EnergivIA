-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INBOUND', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'OUTBOUND');

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "sku" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stock_item_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockItem_organization_id_idx" ON "StockItem"("organization_id");

-- CreateIndex
CREATE INDEX "StockItem_product_id_idx" ON "StockItem"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_organization_id_product_id_key" ON "StockItem"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "StockMovement_organization_id_idx" ON "StockMovement"("organization_id");

-- CreateIndex
CREATE INDEX "StockMovement_stock_item_id_idx" ON "StockMovement"("stock_item_id");

-- CreateIndex
CREATE INDEX "StockMovement_reference_type_reference_id_idx" ON "StockMovement"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
