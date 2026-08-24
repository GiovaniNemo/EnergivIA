/**
 * Script de ingestão da base aberta de Geração Distribuída da ANEEL.
 *
 * Fonte oficial de dados abertos ANEEL:
 * https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida
 *
 * Execução:
 *   pnpm --filter @energivia/api run db:ingest:aneel
 */
import "../../load-env-for-scripts";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 2500;

interface AneelInsertRow {
  codeAneel: string;
  uf: string;
  cityName: string;
  cityId?: string;
  neighborhood?: string;
  zipCode?: string;
  distributor: string;
  classType: string;
  subgroup?: string;
  powerKwp: number;
  modulesCount: number;
  invertersCount: number;
  connectionDate: Date;
  modality?: string;
  latitude?: number;
  longitude?: number;
}

export async function runSeedAneel(prisma: PrismaClient, customPath?: string): Promise<void> {
  console.log("Iniciando ingestão da base de usinas solares da ANEEL...");

  // Cache de cidades para associação rápida por (UF + Nome normalizado)
  const cities = await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      ibgeCode: true,
      state: { select: { uf: true } },
      latitude: true,
      longitude: true,
    },
  });

  const cityMapByName = new Map<string, { id: string; lat?: number; lng?: number }>();
  const cityMapByIbge = new Map<string, { id: string; lat?: number; lng?: number }>();

  for (const c of cities) {
    const key = `${c.state.uf}-${c.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()}`;
    const info = {
      id: c.id,
      lat: c.latitude ? Number(c.latitude) : undefined,
      lng: c.longitude ? Number(c.longitude) : undefined,
    };
    cityMapByName.set(key, info);
    if (c.ibgeCode) {
      cityMapByIbge.set(c.ibgeCode.trim(), info);
    }
  }

  // Identifica o arquivo CSV
  const candidates = [
    customPath,
    path.resolve(process.cwd(), "empreendimento-geracao-distribuida.csv"),
    path.resolve(process.cwd(), "empreendimento-gd.csv.csv"),
    path.resolve(process.cwd(), "empreendimento-gd.csv"),
    path.resolve(process.cwd(), "..", "..", "empreendimento-geracao-distribuida.csv"),
    path.resolve(process.cwd(), "..", "..", "empreendimento-gd.csv.csv"),
    path.resolve(process.cwd(), "..", "..", "empreendimento-gd.csv"),
    path.resolve(__dirname, "../../../../empreendimento-geracao-distribuida.csv"),
    path.resolve(__dirname, "../../../../empreendimento-gd.csv.csv"),
    path.resolve(__dirname, "../../../../empreendimento-gd.csv"),
  ].filter(Boolean) as string[];

  let targetCsv: string | undefined;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      targetCsv = p;
      break;
    }
  }

  if (!targetCsv) {
    console.error(
      "Arquivo CSV da ANEEL não encontrado em nenhum dos locais esperados. Candidatos testados:",
      candidates
    );
    return;
  }

  console.log(`Lendo arquivo: ${targetCsv}`);
  const fileStream = fs.createReadStream(targetCsv, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  let headerIndexes: Record<string, number> = {};
  let batch: AneelInsertRow[] = [];
  let totalInserted = 0;
  let linesRead = 0;

  for await (const line of rl) {
    linesRead++;
    if (isHeader) {
      isHeader = false;
      const headers = line.split(";").map((h) => h.replace(/^"|"$/g, "").trim());
      headers.forEach((h, idx) => {
        headerIndexes[h] = idx;
      });
      continue;
    }
    if (!line.trim()) continue;

    const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());

    const getVal = (name: string, fallbackIdx: number): string => {
      const idx = headerIndexes[name] ?? fallbackIdx;
      return cols[idx] || "";
    };

    const codeAneel = getVal("CodEmpreendimento", 18);
    if (!codeAneel) continue;

    const distributor = getVal("NomAgente", 4) || getVal("SigAgente", 3) || "Distribuidora";
    const uf = (getVal("SigUF", 10) || "SP").toUpperCase();
    const rawCity = getVal("NomMunicipio", 14);
    const ibgeCity = getVal("CodMunicipioIbge", 13);
    const rawClass = getVal("DscClasseConsumo", 6) || "Residencial";
    const subgroup = getVal("DscSubGrupoTarifario", 8);
    const zipCode = getVal("CodCEP", 15);
    const neighborhood = getVal("NomBairro", 7) || undefined;
    const modality = getVal("DscModalidadeHabilitado", 21) || undefined;

    const powerStr = getVal("MdaPotenciaInstaladaKW", 26).replace(",", ".");
    const powerKwp = parseFloat(powerStr) || 4.5;

    const dateStr = getVal("DthAtualizaCadastralEmpreend", 19) || "2022-01-01";
    const connDate = new Date(dateStr);
    const connectionDate = isNaN(connDate.getTime()) ? new Date("2022-01-01") : connDate;

    let classType = "RESIDENTIAL";
    const clLower = rawClass.toLowerCase();
    if (clLower.includes("comercial")) classType = "COMMERCIAL";
    else if (clLower.includes("industrial")) classType = "INDUSTRIAL";
    else if (clLower.includes("rural")) classType = "RURAL";

    // Resolução de cidade por IBGE ou Nome normalizado
    let cityInfo = ibgeCity ? cityMapByIbge.get(ibgeCity) : undefined;
    if (!cityInfo && rawCity) {
      const normKey = `${uf}-${rawCity
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()}`;
      cityInfo = cityMapByName.get(normKey);
    }

    batch.push({
      codeAneel,
      uf,
      cityName: rawCity || "Desconhecido",
      cityId: cityInfo?.id,
      neighborhood,
      zipCode,
      distributor,
      classType,
      subgroup,
      powerKwp,
      modulesCount: Math.round((powerKwp * 1000) / 575),
      invertersCount: powerKwp > 30 ? 2 : 1,
      connectionDate,
      modality,
      latitude: cityInfo?.lat,
      longitude: cityInfo?.lng,
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.aneelInstallation.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += batch.length;
      console.log(`[ANEEL Ingest] Linhas lidas: ${linesRead} | Usinas inseridas: ${totalInserted}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.aneelInstallation.createMany({
      data: batch,
      skipDuplicates: true,
    });
    totalInserted += batch.length;
  }

  console.log(
    `[ANEEL Ingest] Sucesso absoluto! Total de usinas inseridas no banco: ${totalInserted}`
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await runSeedAneel(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Erro na ingestão ANEEL:", err);
    process.exit(1);
  });
}
