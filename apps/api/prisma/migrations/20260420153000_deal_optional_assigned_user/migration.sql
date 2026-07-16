ALTER TABLE "Deal"
ADD COLUMN "assigned_user_id" TEXT;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_assigned_user_id_fkey"
FOREIGN KEY ("assigned_user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Deal_assigned_user_id_idx" ON "Deal"("assigned_user_id");
