-- AlterTable
ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "zapsign_addon_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "zapsign_subscription_item_id" TEXT;

-- AlterTable
ALTER TABLE "Proposal"
ADD COLUMN IF NOT EXISTS "zapsign_doc_token" TEXT,
ADD COLUMN IF NOT EXISTS "zapsign_signer_token" TEXT,
ADD COLUMN IF NOT EXISTS "zapsign_sign_url" TEXT,
ADD COLUMN IF NOT EXISTS "zapsign_status" TEXT,
ADD COLUMN IF NOT EXISTS "zapsign_signed_pdf_url" TEXT,
ADD COLUMN IF NOT EXISTS "zapsign_signed_at" TIMESTAMP(3);
