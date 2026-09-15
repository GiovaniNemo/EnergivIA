-- CreateTable
CREATE TABLE "platform_feedbacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "user_email" TEXT,
    "phone" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "user_plan" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_feedbacks_tenant_id_idx" ON "platform_feedbacks"("tenant_id");
CREATE INDEX "platform_feedbacks_user_id_idx" ON "platform_feedbacks"("user_id");
CREATE INDEX "platform_feedbacks_channel_idx" ON "platform_feedbacks"("channel");
CREATE INDEX "platform_feedbacks_rating_idx" ON "platform_feedbacks"("rating");
CREATE INDEX "platform_feedbacks_created_at_idx" ON "platform_feedbacks"("created_at");

-- AddForeignKey
ALTER TABLE "platform_feedbacks" ADD CONSTRAINT "platform_feedbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_feedbacks" ADD CONSTRAINT "platform_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
