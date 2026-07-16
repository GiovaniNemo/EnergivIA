-- Frete por UF: regra de uma distribuidora OU do estoque próprio de uma organização
CREATE TABLE "freight_rules" (
    "id" TEXT NOT NULL,
    "distributor_id" TEXT,
    "organization_id" TEXT,
    "state" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "freight_rules_distributor_id_state_key" ON "freight_rules"("distributor_id", "state");
CREATE UNIQUE INDEX "freight_rules_organization_id_state_key" ON "freight_rules"("organization_id", "state");
CREATE INDEX "freight_rules_distributor_id_idx" ON "freight_rules"("distributor_id");
CREATE INDEX "freight_rules_organization_id_idx" ON "freight_rules"("organization_id");

ALTER TABLE "freight_rules" ADD CONSTRAINT "freight_rules_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freight_rules" ADD CONSTRAINT "freight_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
