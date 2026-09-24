-- AlterTable Distributor
ALTER TABLE "Distributor" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable DistributorProduct
ALTER TABLE "DistributorProduct" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Distributor_active_idx" ON "Distributor"("active");
CREATE INDEX IF NOT EXISTS "DistributorProduct_active_idx" ON "DistributorProduct"("active");

-- Deactivate Aldo Solar initially as requested by user
UPDATE "Distributor" SET "active" = false WHERE LOWER("name") LIKE '%aldo%';
