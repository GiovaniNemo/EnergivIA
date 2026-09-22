-- CreateTable
CREATE TABLE IF NOT EXISTS "terms_acceptance_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT,
    "user_email" TEXT,
    "terms_version" TEXT NOT NULL DEFAULT '2026-09-22-v1',
    "terms_type" TEXT NOT NULL DEFAULT 'TERMS_OF_USE_AND_TECHNICAL_RESPONSIBILITY',
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WEB_ONBOARDING',
    "document_snapshot" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "terms_acceptance_logs_organization_id_idx" ON "terms_acceptance_logs"("organization_id");
CREATE INDEX IF NOT EXISTS "terms_acceptance_logs_user_id_idx" ON "terms_acceptance_logs"("user_id");
CREATE INDEX IF NOT EXISTS "terms_acceptance_logs_accepted_at_idx" ON "terms_acceptance_logs"("accepted_at");
CREATE INDEX IF NOT EXISTS "terms_acceptance_logs_terms_version_idx" ON "terms_acceptance_logs"("terms_version");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_acceptance_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE "terms_acceptance_logs" ADD CONSTRAINT "terms_acceptance_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_acceptance_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "terms_acceptance_logs" ADD CONSTRAINT "terms_acceptance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
