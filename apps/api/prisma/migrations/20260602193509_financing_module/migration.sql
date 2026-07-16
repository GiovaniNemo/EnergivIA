-- CreateEnum
CREATE TYPE "FinancingProviderMode" AS ENUM ('API', 'ASSISTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "FinancingPersonType" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "FinancingSimulationStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "FinancingOfferEligibility" AS ENUM ('ESTIMATED', 'PRE_APPROVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FinancingApplicationStatus" AS ENUM ('CREATED', 'AWAITING_DOCUMENTS', 'DOCUMENTS_RECEIVED', 'SUBMITTED_TO_BANK', 'UNDER_REVIEW', 'PENDING', 'APPROVED', 'REJECTED', 'CONTRACT_SIGNED', 'CREDIT_RELEASED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FinancingDocumentStatus" AS ENUM ('REQUIRED', 'UPLOADED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FinancingTimelineEventType" AS ENUM ('SIMULATION_CREATED', 'OFFER_SELECTED', 'APPLICATION_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'SUBMITTED_TO_BANK', 'STATUS_CHANGED', 'PENDENCY_OPENED', 'APPROVED', 'REJECTED', 'CONTRACT_SIGNED', 'CREDIT_RELEASED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "financing_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "mode" "FinancingProviderMode" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "supports_pf" BOOLEAN NOT NULL DEFAULT true,
    "supports_pj" BOOLEAN NOT NULL DEFAULT false,
    "api_config" JSONB,
    "docs_required" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_financing_providers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "api_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_financing_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_rate_tables" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "person_type" "FinancingPersonType" NOT NULL DEFAULT 'PF',
    "min_amount" DECIMAL(14,2) NOT NULL,
    "max_amount" DECIMAL(14,2) NOT NULL,
    "min_term" INTEGER NOT NULL,
    "max_term" INTEGER NOT NULL,
    "monthly_rate" DECIMAL(8,6) NOT NULL,
    "fee_rate" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_rate_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_simulations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "person_type" "FinancingPersonType" NOT NULL DEFAULT 'PF',
    "project_amount" DECIMAL(14,2) NOT NULL,
    "down_payment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "financed_amount" DECIMAL(14,2) NOT NULL,
    "requested_term" INTEGER NOT NULL,
    "status" "FinancingSimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "error_message" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_offers" (
    "id" TEXT NOT NULL,
    "simulation_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "rate_table_id" TEXT,
    "financed_amount" DECIMAL(14,2) NOT NULL,
    "term" INTEGER NOT NULL,
    "monthly_rate" DECIMAL(8,6) NOT NULL,
    "cet" DECIMAL(8,6) NOT NULL,
    "installment_value" DECIMAL(14,2) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "eligibility_status" "FinancingOfferEligibility" NOT NULL DEFAULT 'ESTIMATED',
    "score" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_applications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "simulation_id" TEXT NOT NULL,
    "selected_offer_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "assigned_user_id" TEXT,
    "status" "FinancingApplicationStatus" NOT NULL DEFAULT 'CREATED',
    "external_reference" TEXT,
    "approved_amount" DECIMAL(14,2),
    "approved_term" INTEGER,
    "approved_rate" DECIMAL(8,6),
    "approved_cet" DECIMAL(8,6),
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "FinancingDocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_timeline_events" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "type" "FinancingTimelineEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financing_providers_name_key" ON "financing_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "financing_providers_slug_key" ON "financing_providers"("slug");

-- CreateIndex
CREATE INDEX "financing_providers_active_idx" ON "financing_providers"("active");

-- CreateIndex
CREATE INDEX "financing_providers_mode_idx" ON "financing_providers"("mode");

-- CreateIndex
CREATE INDEX "tenant_financing_providers_tenant_id_active_idx" ON "tenant_financing_providers"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_financing_providers_tenant_id_provider_id_key" ON "tenant_financing_providers"("tenant_id", "provider_id");

-- CreateIndex
CREATE INDEX "financing_rate_tables_provider_id_tenant_id_active_idx" ON "financing_rate_tables"("provider_id", "tenant_id", "active");

-- CreateIndex
CREATE INDEX "financing_rate_tables_provider_id_person_type_active_idx" ON "financing_rate_tables"("provider_id", "person_type", "active");

-- CreateIndex
CREATE INDEX "financing_simulations_tenant_id_lead_id_idx" ON "financing_simulations"("tenant_id", "lead_id");

-- CreateIndex
CREATE INDEX "financing_simulations_tenant_id_deal_id_idx" ON "financing_simulations"("tenant_id", "deal_id");

-- CreateIndex
CREATE INDEX "financing_simulations_tenant_id_status_idx" ON "financing_simulations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "financing_offers_simulation_id_idx" ON "financing_offers"("simulation_id");

-- CreateIndex
CREATE INDEX "financing_offers_provider_id_idx" ON "financing_offers"("provider_id");

-- CreateIndex
CREATE INDEX "financing_applications_tenant_id_status_idx" ON "financing_applications"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "financing_applications_tenant_id_assigned_user_id_idx" ON "financing_applications"("tenant_id", "assigned_user_id");

-- CreateIndex
CREATE INDEX "financing_applications_simulation_id_idx" ON "financing_applications"("simulation_id");

-- CreateIndex
CREATE INDEX "financing_documents_application_id_status_idx" ON "financing_documents"("application_id", "status");

-- CreateIndex
CREATE INDEX "financing_timeline_events_application_id_created_at_idx" ON "financing_timeline_events"("application_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "tenant_financing_providers" ADD CONSTRAINT "tenant_financing_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_rate_tables" ADD CONSTRAINT "financing_rate_tables_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "financing_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "financing_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_selected_offer_id_fkey" FOREIGN KEY ("selected_offer_id") REFERENCES "financing_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "financing_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_documents" ADD CONSTRAINT "financing_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "financing_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_timeline_events" ADD CONSTRAINT "financing_timeline_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "financing_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
