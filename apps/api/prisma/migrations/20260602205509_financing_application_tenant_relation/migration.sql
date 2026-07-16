-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
