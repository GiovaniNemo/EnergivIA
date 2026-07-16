/**
 * Loads Brazilian states and municipalities from IBGE public API into geo_states / geo_cities.
 *
 * API: https://servicodados.ibge.gov.br/api/v1/localidades
 */
import "../../load-env-for-scripts";
import { PrismaClient } from "@prisma/client";

type IbgeRegiao = { id: number; sigla: string; nome: string };

type IbgeUf = {
  id: number;
  sigla: string;
  nome: string;
  regiao: IbgeRegiao;
};

type IbgeMunicipioBasico = {
  id: number;
  nome: string;
};

/** IBGE is often slow or flaky; conservative timeouts, retries, and spacing between UF requests. */
const FETCH_TIMEOUT_MS = 120_000;
const FETCH_RETRIES = 5;
const DELAY_BETWEEN_UF_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonOnce<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`IBGE request failed ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(2000 * 2 ** (attempt - 1), 45_000);
      console.warn(`IBGE fetch retry ${attempt}/${FETCH_RETRIES - 1} in ${backoff}ms — ${url}`);
      await sleep(backoff);
    }
    try {
      return await fetchJsonOnce<T>(url);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function runSeedIbge(db: PrismaClient): Promise<void> {
  const estados = await fetchJson<IbgeUf[]>(
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
  );

  const ufToStateId = new Map<string, string>();

  for (const e of estados) {
    const row = await db.state.upsert({
      where: { ibgeCode: String(e.id) },
      create: {
        ibgeCode: String(e.id),
        uf: e.sigla,
        name: e.nome,
        region: e.regiao?.nome ?? null,
        countryCode: "BR",
      },
      update: {
        name: e.nome,
        region: e.regiao?.nome ?? null,
      },
    });
    ufToStateId.set(e.sigla, row.id);
  }

  console.log(`States upserted: ${estados.length}`);

  const batchSize = 80;
  let upserted = 0;
  let totalMunicipios = 0;

  for (let ui = 0; ui < estados.length; ui++) {
    const est = estados[ui]!;
    if (ui > 0 && DELAY_BETWEEN_UF_MS > 0) {
      await sleep(DELAY_BETWEEN_UF_MS);
    }
    const municipios = await fetchJson<IbgeMunicipioBasico[]>(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${est.id}/municipios?orderBy=nome`
    );
    totalMunicipios += municipios.length;
    const stateId = ufToStateId.get(est.sigla);
    if (!stateId) {
      throw new Error(`Missing internal state id for UF ${est.sigla}`);
    }
    for (let i = 0; i < municipios.length; i += batchSize) {
      const chunk = municipios.slice(i, i + batchSize);
      await db.$transaction(
        async (tx) => {
          for (const m of chunk) {
            await tx.city.upsert({
              where: { ibgeCode: String(m.id) },
              create: {
                ibgeCode: String(m.id),
                name: m.nome,
                stateId,
              },
              update: {
                name: m.nome,
                stateId,
              },
            });
          }
        },
        { maxWait: 60_000, timeout: 120_000 }
      );
      upserted += chunk.length;
    }
    console.log(`UF ${est.sigla}: ${municipios.length} cities (running total ${upserted})`);
  }

  console.log(`IBGE geo seed completed. Total municipalities: ${totalMunicipios}.`);
}

async function cli() {
  const prisma = new PrismaClient();
  try {
    await runSeedIbge(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void cli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
