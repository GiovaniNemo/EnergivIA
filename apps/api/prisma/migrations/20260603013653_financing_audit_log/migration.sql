-- CreateEnum
CREATE TYPE "FinancingAuditEventType" AS ENUM ('APPLICATION_UPDATED', 'STATUS_TRANSITIONED', 'COMMISSION_UPDATED', 'DOCUMENT_REVIEWED');

-- CreateTable
CREATE TABLE "financing_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT,
    "commission_id" TEXT,
    "user_id" TEXT,
    "user_role" TEXT,
    "event_type" "FinancingAuditEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financing_audit_logs_tenant_id_application_id_created_at_idx" ON "financing_audit_logs"("tenant_id", "application_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "financing_audit_logs_commission_id_created_at_idx" ON "financing_audit_logs"("commission_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "financing_audit_logs_tenant_id_event_type_created_at_idx" ON "financing_audit_logs"("tenant_id", "event_type", "created_at" DESC);
