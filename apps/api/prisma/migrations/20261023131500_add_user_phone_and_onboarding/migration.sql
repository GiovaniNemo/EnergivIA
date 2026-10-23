-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "onboarding_abandoned_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "onboarding_status" TEXT DEFAULT 'IN_PROGRESS',
ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_onboarding_status_idx" ON "User"("onboarding_status");
