-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROPOSAL_VIEWED', 'PROPOSAL_REVISITED', 'LEAD_NEEDS_ATTENTION', 'LEAD_SCHEDULE_PENDING', 'FOLLOWUP_REMINDER');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "client_first_viewed_at" TIMESTAMP(3),
ADD COLUMN     "client_last_viewed_at" TIMESTAMP(3),
ADD COLUMN     "client_view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_revisit_notified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_path" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "proposal_id" TEXT,
    "lead_id" TEXT,
    "deal_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_created_at_idx" ON "user_notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "user_notifications_tenant_id_type_proposal_id_idx" ON "user_notifications"("tenant_id", "type", "proposal_id");

-- CreateIndex
CREATE INDEX "user_notifications_tenant_id_type_lead_id_idx" ON "user_notifications"("tenant_id", "type", "lead_id");

-- CreateIndex
CREATE INDEX "user_notifications_tenant_id_idx" ON "user_notifications"("tenant_id");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
