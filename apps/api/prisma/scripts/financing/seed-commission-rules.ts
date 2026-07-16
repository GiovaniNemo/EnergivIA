/**
 * Seed das regras de comissão da Energivia por provider.
 * Idempotente — apaga e recria.
 *
 * Uso: `pnpm --filter @energivia/api exec ts-node prisma/scripts/financing/seed-commission-rules.ts`
 */

import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RuleSeed {
  providerSlug: string;
  personType?: "PF" | "PJ" | null;
  /** Decimal: 0.015 = 1,5% */
  value: number;
  calculationType?: "PERCENTAGE" | "FIXED";
  baseAmount?: "FINANCED_AMOUNT" | "TOTAL_AMOUNT";
  minAmount?: number;
  maxAmount?: number;
  notes?: string;
}

// Comissões típicas no mercado de financiamento solar (BR):
//   - Big banks (BV): 1,2% – 2% sobre valor financiado
//   - Cooperativas (Cresol/Sicredi/Sicoob): 1,5% – 3% (mais agressivo pra captar volume)
const seeds: RuleSeed[] = [
  {
    providerSlug: "bv",
    personType: null,
    value: 0.015,
    notes: "Padrão BV — 1,5% sobre valor financiado",
  },
  {
    providerSlug: "cresol",
    personType: null,
    value: 0.022,
    notes: "Padrão Cresol — 2,2% sobre valor financiado",
  },
  {
    providerSlug: "sicredi",
    personType: null,
    value: 0.02,
    notes: "Padrão Sicredi — 2,0% sobre valor financiado",
  },
  {
    providerSlug: "sicoob",
    personType: null,
    value: 0.025,
    notes: "Padrão Sicoob — 2,5% sobre valor financiado (manual)",
  },
];

async function main() {
  console.log("Seeding commission rules…");
  for (const rule of seeds) {
    const provider = await prisma.financingProvider.findUnique({
      where: { slug: rule.providerSlug },
    });
    if (!provider) {
      console.warn(`  ! Provider slug=${rule.providerSlug} não encontrado, pulando.`);
      continue;
    }

    // Idempotente: apaga regras existentes pro provider e recria.
    await prisma.financingCommissionRule.deleteMany({
      where: { providerId: provider.id },
    });

    await prisma.financingCommissionRule.create({
      data: {
        providerId: provider.id,
        personType: rule.personType ?? null,
        calculationType: rule.calculationType ?? "PERCENTAGE",
        value: new Decimal(rule.value),
        baseAmount: rule.baseAmount ?? "FINANCED_AMOUNT",
        minAmount: rule.minAmount != null ? new Decimal(rule.minAmount) : null,
        maxAmount: rule.maxAmount != null ? new Decimal(rule.maxAmount) : null,
        active: true,
        notes: rule.notes ?? null,
      },
    });
    console.log(`  ✓ ${provider.name}: ${(rule.value * 100).toFixed(2)}% sobre valor financiado`);
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
