/**
 * Seed dos providers de financiamento + tabelas de taxa "globais" (tenantId = null).
 * Idempotente — pode rodar várias vezes.
 *
 * Uso: `pnpm --filter @energivia/api exec ts-node prisma/scripts/financing/seed-financing.ts`
 */

import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RateTableSeed {
  personType: "PF" | "PJ";
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  monthlyRate: number; // decimal (ex.: 0.0185 = 1,85%)
  feeRate?: number;
}

interface ProviderSeed {
  name: string;
  slug: string;
  mode: "API" | "ASSISTED" | "MANUAL";
  logoUrl?: string;
  supportsPF: boolean;
  supportsPJ: boolean;
  docsRequired: { PF: string[]; PJ: string[] };
  rateTables: RateTableSeed[];
}

const DOCS_PF = ["RG", "CPF", "COMPROVANTE_RESIDENCIA", "COMPROVANTE_RENDA"];

const DOCS_PJ = ["CONTRATO_SOCIAL", "CNPJ", "BALANCO", "DOCUMENTOS_SOCIOS"];

const providers: ProviderSeed[] = [
  {
    name: "BV Financeira",
    slug: "bv",
    mode: "API", // stub por enquanto; vira API real na Phase 3
    supportsPF: true,
    supportsPJ: false,
    docsRequired: { PF: DOCS_PF, PJ: [] },
    rateTables: [
      {
        personType: "PF",
        minAmount: 5000,
        maxAmount: 150_000,
        minTerm: 12,
        maxTerm: 72,
        monthlyRate: 0.0179,
      },
      {
        personType: "PF",
        minAmount: 150_001,
        maxAmount: 500_000,
        minTerm: 24,
        maxTerm: 96,
        monthlyRate: 0.0165,
      },
    ],
  },
  {
    name: "Cresol",
    slug: "cresol",
    mode: "ASSISTED",
    supportsPF: true,
    supportsPJ: true,
    docsRequired: { PF: DOCS_PF, PJ: DOCS_PJ },
    rateTables: [
      {
        personType: "PF",
        minAmount: 5000,
        maxAmount: 300_000,
        minTerm: 12,
        maxTerm: 84,
        monthlyRate: 0.0145,
      },
      {
        personType: "PJ",
        minAmount: 20_000,
        maxAmount: 1_000_000,
        minTerm: 12,
        maxTerm: 120,
        monthlyRate: 0.0138,
      },
    ],
  },
  {
    name: "Sicredi",
    slug: "sicredi",
    mode: "ASSISTED",
    supportsPF: true,
    supportsPJ: true,
    docsRequired: { PF: DOCS_PF, PJ: DOCS_PJ },
    rateTables: [
      {
        personType: "PF",
        minAmount: 5000,
        maxAmount: 250_000,
        minTerm: 12,
        maxTerm: 72,
        monthlyRate: 0.0152,
      },
      {
        personType: "PJ",
        minAmount: 20_000,
        maxAmount: 800_000,
        minTerm: 12,
        maxTerm: 96,
        monthlyRate: 0.0148,
      },
    ],
  },
  {
    name: "Sicoob",
    slug: "sicoob",
    mode: "MANUAL",
    supportsPF: true,
    supportsPJ: true,
    docsRequired: { PF: DOCS_PF, PJ: DOCS_PJ },
    rateTables: [
      {
        personType: "PF",
        minAmount: 5000,
        maxAmount: 200_000,
        minTerm: 12,
        maxTerm: 60,
        monthlyRate: 0.0168,
      },
      {
        personType: "PJ",
        minAmount: 20_000,
        maxAmount: 500_000,
        minTerm: 12,
        maxTerm: 84,
        monthlyRate: 0.0155,
      },
    ],
  },
];

async function main() {
  console.log("Seeding financing providers + rate tables…");

  for (const p of providers) {
    const provider = await prisma.financingProvider.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        mode: p.mode,
        logoUrl: p.logoUrl,
        supportsPF: p.supportsPF,
        supportsPJ: p.supportsPJ,
        active: true,
        docsRequired: p.docsRequired as never,
      },
      update: {
        name: p.name,
        mode: p.mode,
        logoUrl: p.logoUrl,
        supportsPF: p.supportsPF,
        supportsPJ: p.supportsPJ,
        docsRequired: p.docsRequired as never,
      },
    });

    // Cria tabelas globais (tenantId null) — apaga e recria pra simplificar idempotência.
    await prisma.financingRateTable.deleteMany({
      where: { providerId: provider.id, tenantId: null },
    });
    for (const rt of p.rateTables) {
      await prisma.financingRateTable.create({
        data: {
          providerId: provider.id,
          tenantId: null,
          personType: rt.personType,
          minAmount: new Decimal(rt.minAmount),
          maxAmount: new Decimal(rt.maxAmount),
          minTerm: rt.minTerm,
          maxTerm: rt.maxTerm,
          monthlyRate: new Decimal(rt.monthlyRate),
          feeRate: new Decimal(rt.feeRate ?? 0),
          active: true,
        },
      });
    }
    console.log(`  ✓ ${p.name} (${p.mode}) com ${p.rateTables.length} tabela(s).`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
