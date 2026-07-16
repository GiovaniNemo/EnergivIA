/**
 * Ingest único: estados + municípios (IBGE) e irradiação solar por sede municipal (INPE Atlas, CSV em repo).
 *
 * Pré-requisitos: `DATABASE_URL` em `apps/api/.env`, migrations aplicadas.
 *
 * Uso (na raiz do monorepo):
 *   pnpm --filter @energivia/api run db:ingest:geo
 */
import "../../load-env-for-scripts";
import { PrismaClient } from "@prisma/client";
import { runSeedIbge } from "./seed-ibge";
import { runSeedIrradiation } from "./seed-irradiation";

async function main() {
  if (!process.env["DATABASE_URL"]?.trim()) {
    console.error("DATABASE_URL is not set. Configure apps/api/.env before running ingest.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log("\n=== 1/2 IBGE — estados e municípios (geo_states, geo_cities) ===\n");
    await runSeedIbge(prisma);
    console.log("\n=== 2/2 INPE — irradiação e coordenadas nas cidades (solar_resource) ===\n");
    await runSeedIrradiation(prisma);
    console.log("\n=== Ingest geo concluído ===\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
