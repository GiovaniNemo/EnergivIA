-- CreateEnum
CREATE TYPE "CommissionCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionBase" AS ENUM ('FINANCED_AMOUNT', 'TOTAL_AMOUNT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "financing_commission_rules" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "person_type" "FinancingPersonType",
    "calculation_type" "CommissionCalculationType" NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "base_amount" "CommissionBase" NOT NULL DEFAULT 'FINANCED_AMOUNT',
    "min_amount" DECIMAL(14,2),
    "max_amount" DECIMAL(14,2),
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_commissions" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "calculation_type" "CommissionCalculationType" NOT NULL,
    "applied_value" DECIMAL(10,4) NOT NULL,
    "base_amount" "CommissionBase" NOT NULL,
    "base_amount_brl" DECIMAL(14,2) NOT NULL,
    "gross_commission_brl" DECIMAL(14,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financing_commission_rules_provider_id_active_idx" ON "financing_commission_rules"("provider_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "financing_commissions_application_id_key" ON "financing_commissions"("application_id");

-- CreateIndex
CREATE INDEX "financing_commissions_provider_id_status_idx" ON "financing_commissions"("provider_id", "status");

-- CreateIndex
CREATE INDEX "financing_commissions_tenant_id_idx" ON "financing_commissions"("tenant_id");

-- CreateIndex
CREATE INDEX "financing_commissions_status_created_at_idx" ON "financing_commissions"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "financing_commission_rules" ADD CONSTRAINT "financing_commission_rules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_commissions" ADD CONSTRAINT "financing_commissions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "financing_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_commissions" ADD CONSTRAINT "financing_commissions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
