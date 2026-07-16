-- CreateEnum
CREATE TYPE "CostCalculationType" AS ENUM ('FIXED', 'PERCENTAGE', 'PER_KWP');

-- CreateTable
CREATE TABLE "company_cost_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calculation_type" "CostCalculationType" NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "min_kwp" DECIMAL(12,4),
    "max_kwp" DECIMAL(12,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_cost_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_cost_rules_organization_id_idx" ON "company_cost_rules"("organization_id");

CREATE INDEX "company_cost_rules_organization_id_name_idx" ON "company_cost_rules"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "company_cost_rules" ADD CONSTRAINT "company_cost_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
