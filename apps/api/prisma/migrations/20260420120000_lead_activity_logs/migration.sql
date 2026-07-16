-- CreateEnum
CREATE TYPE "LeadActivityKind" AS ENUM (
  'LEAD_CREATED',
  'SIMULATION_ADDED',
  'DEAL_CREATED',
  'PROPOSAL_CREATED',
  'PROPOSAL_SENT',
  'PROPOSAL_VIEWED',
  'NOTE_ADDED',
  'CALL_LOGGED'
);

-- CreateTable
CREATE TABLE "lead_activity_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "kind" "LeadActivityKind" NOT NULL,
    "label" TEXT NOT NULL,
    "meta" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_activity_logs_tenant_id_lead_id_occurred_at_idx" ON "lead_activity_logs"("tenant_id", "lead_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "lead_activity_logs" ADD CONSTRAINT "lead_activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_activity_logs" ADD CONSTRAINT "lead_activity_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
