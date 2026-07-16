-- CreateTable
CREATE TABLE "tenant_whatsapp_inbound_phones" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "phone_digits" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_whatsapp_inbound_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_whatsapp_inbound_phones_phone_digits_key" ON "tenant_whatsapp_inbound_phones"("phone_digits");

-- CreateIndex
CREATE INDEX "tenant_whatsapp_inbound_phones_organization_id_idx" ON "tenant_whatsapp_inbound_phones"("organization_id");

-- AddForeignKey
ALTER TABLE "tenant_whatsapp_inbound_phones" ADD CONSTRAINT "tenant_whatsapp_inbound_phones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
