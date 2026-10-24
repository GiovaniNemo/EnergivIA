-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_SALES';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,4) DEFAULT 0.10;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_referral_code_key" ON "User"("referral_code");

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "sales_rep_id" TEXT,
ADD COLUMN IF NOT EXISTS "referral_code" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tenant_sales_rep_id_idx" ON "Tenant"("sales_rep_id");
CREATE INDEX IF NOT EXISTS "Tenant_referral_code_idx" ON "Tenant"("referral_code");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_sales_rep_id_fkey'
  ) THEN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "sales_activity_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sales_rep_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'TRIAL_ONBOARDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_activity_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_activity_notes_tenant_id_idx" ON "sales_activity_notes"("tenant_id");
CREATE INDEX IF NOT EXISTS "sales_activity_notes_sales_rep_id_idx" ON "sales_activity_notes"("sales_rep_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_activity_notes_tenant_id_fkey'
  ) THEN
    ALTER TABLE "sales_activity_notes" ADD CONSTRAINT "sales_activity_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_activity_notes_sales_rep_id_fkey'
  ) THEN
    ALTER TABLE "sales_activity_notes" ADD CONSTRAINT "sales_activity_notes_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
