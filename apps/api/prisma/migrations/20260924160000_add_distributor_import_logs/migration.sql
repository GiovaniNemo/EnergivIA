-- CreateTable
CREATE TABLE "distributor_import_logs" (
    "id" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "file_name" TEXT,
    "summary" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "distributor_import_logs_distributor_id_idx" ON "distributor_import_logs"("distributor_id");

-- CreateIndex
CREATE INDEX "distributor_import_logs_created_at_idx" ON "distributor_import_logs"("created_at");

-- AddForeignKey
ALTER TABLE "distributor_import_logs" ADD CONSTRAINT "distributor_import_logs_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
