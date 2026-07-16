/**
 * Merges INPE LABREN Atlas 2017 (tilted plane, municipal seats) CSV into geo_cities.solar_resource
 * and coordinates. Emits match-report.json for audit.
 *
 * Source file: prisma/data/irradiation/tilted_latitude_means_sedes-munic.csv
 */
import "../../load-env-for-scripts";
import * as fs from "node:fs";
import * as path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

import { normalizeGeoName } from "./normalize-geo-name";

const CSV_NAME = "tilted_latitude_means_sedes-munic.csv";
const REPORT_NAME = "match-report.json";

const SOLAR_RESOURCE_TEMPLATE = {
  source: "INPE_LABREN_AtlasSolar_2ed_2017",
  metric: "global_irradiance_tilted_plane_municipal_seat",
  unit: "Wh/m2/day",
  description:
    "Monthly and annual means of daily total irradiance on tilted plane at municipal seat (Atlas definition).",
  monthOrder: "JAN_TO_DEC" as const,
};

type CsvRow = {
  id: number;
  lon: number;
  lat: number;
  name: string;
  className: string;
  state: string;
  annual: number;
  monthly: number[];
};

function prismaRoot(): string {
  return path.join(__dirname, "../..");
}

function readCsvRows(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error(`CSV empty or missing header: ${filePath}`);
  }
  const header = lines[0]!.split(";");
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) {
      throw new Error(`Missing column ${name} in CSV header`);
    }
    return i;
  };
  const iId = idx("ID");
  const iLon = idx("LON");
  const iLat = idx("LAT");
  const iName = idx("NAME");
  const iClass = idx("CLASS");
  const iState = idx("STATE");
  const iAnnual = idx("ANNUAL");
  const monthCols = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const iMonths = monthCols.map((c) => idx(c));

  const rows: CsvRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = lines[li]!.split(";");
    if (parts.length < header.length) continue;
    const monthly = iMonths.map((i) => Number(parts[i]!.replace(",", ".")));
    if (monthly.some((n) => Number.isNaN(n))) continue;
    rows.push({
      id: Number(parts[iId]),
      lon: Number(parts[iLon]),
      lat: Number(parts[iLat]),
      name: parts[iName]!,
      className: parts[iClass]!,
      state: parts[iState]!,
      annual: Number(parts[iAnnual]),
      monthly,
    });
  }
  return rows;
}

function buildSolarJson(row: CsvRow): Prisma.InputJsonValue {
  return {
    ...SOLAR_RESOURCE_TEMPLATE,
    annual: row.annual,
    monthly: row.monthly,
    csvRowId: row.id,
    csvClass: row.className,
  };
}

const UPDATE_CHUNK = 80;

export async function runSeedIrradiation(db: PrismaClient): Promise<void> {
  const root = prismaRoot();
  const csvPath = path.join(root, "data", "irradiation", CSV_NAME);
  if (!fs.existsSync(csvPath)) {
    console.error(
      `Missing ${csvPath}. Copy tilted_latitude_means_sedes-munic.csv from INPE LABREN Atlas 2017 download.`
    );
    process.exit(1);
  }

  const csvRows = readCsvRows(csvPath);

  const states = await db.state.findMany();
  const stateNormToUf = new Map<string, string>();
  for (const s of states) {
    stateNormToUf.set(normalizeGeoName(s.name), s.uf);
  }

  const cities = await db.city.findMany({
    include: { state: true },
  });

  const citiesByKey = new Map<string, { id: string; ibgeCode: string; name: string }[]>();
  for (const c of cities) {
    const key = `${c.state.uf}|${normalizeGeoName(c.name)}`;
    const list = citiesByKey.get(key) ?? [];
    list.push({ id: c.id, ibgeCode: c.ibgeCode, name: c.name });
    citiesByKey.set(key, list);
  }

  let matchedRows = 0;
  let orphanCsv = 0;
  let ambiguousCsv = 0;
  const orphanSamples: { state: string; name: string; reason: string }[] = [];
  const ambiguousSamples: { key: string; ibgeCodes: string[] }[] = [];
  const matchedKeys = new Set<string>();
  const ambiguousKeys = new Set<string>();

  const pendingUpdates: {
    id: string;
    lat: Prisma.Decimal;
    lon: Prisma.Decimal;
    solarResource: Prisma.InputJsonValue;
  }[] = [];

  for (const row of csvRows) {
    const uf = stateNormToUf.get(normalizeGeoName(row.state));
    if (!uf) {
      orphanCsv++;
      if (orphanSamples.length < 40) {
        orphanSamples.push({
          state: row.state,
          name: row.name,
          reason: "unknown_state_label_in_csv",
        });
      }
      continue;
    }
    const key = `${uf}|${normalizeGeoName(row.name)}`;
    const candidates = citiesByKey.get(key);
    if (!candidates?.length) {
      orphanCsv++;
      if (orphanSamples.length < 40) {
        orphanSamples.push({
          state: row.state,
          name: row.name,
          reason: "no_ibge_city_for_normalized_name",
        });
      }
      continue;
    }
    if (candidates.length > 1) {
      ambiguousCsv++;
      ambiguousKeys.add(key);
      if (ambiguousSamples.length < 40) {
        ambiguousSamples.push({
          key,
          ibgeCodes: candidates.map((c) => c.ibgeCode),
        });
      }
      continue;
    }

    const city = candidates[0]!;
    pendingUpdates.push({
      id: city.id,
      lat: new Prisma.Decimal(row.lat.toFixed(7)),
      lon: new Prisma.Decimal(row.lon.toFixed(7)),
      solarResource: buildSolarJson(row),
    });
    matchedRows++;
    matchedKeys.add(key);
  }

  for (let i = 0; i < pendingUpdates.length; i += UPDATE_CHUNK) {
    const chunk = pendingUpdates.slice(i, i + UPDATE_CHUNK);
    await db.$transaction(
      async (tx) => {
        for (const u of chunk) {
          await tx.city.update({
            where: { id: u.id },
            data: {
              latitude: u.lat,
              longitude: u.lon,
              solarResource: u.solarResource,
            },
          });
        }
      },
      { maxWait: 60_000, timeout: 120_000 }
    );
  }

  const missing = await db.city.findMany({
    where: { solarResource: { equals: Prisma.DbNull } },
    include: { state: true },
    orderBy: [{ state: { uf: "asc" } }, { name: "asc" }],
  });

  type MissingReason =
    | "ambiguous_multiple_ibge_cities_same_normalized_name"
    | "no_csv_row_matching_ibge_normalized_name";

  const missingDetailed: {
    ibgeCode: string;
    uf: string;
    name: string;
    reason: MissingReason;
  }[] = [];

  for (const c of missing) {
    const key = `${c.state.uf}|${normalizeGeoName(c.name)}`;
    const reason: MissingReason = ambiguousKeys.has(key)
      ? "ambiguous_multiple_ibge_cities_same_normalized_name"
      : "no_csv_row_matching_ibge_normalized_name";
    missingDetailed.push({
      ibgeCode: c.ibgeCode,
      uf: c.state.uf,
      name: c.name,
      reason,
    });
  }

  const bucketCounts = {
    ambiguous_multiple_ibge_cities_same_normalized_name: missingDetailed.filter(
      (m) => m.reason === "ambiguous_multiple_ibge_cities_same_normalized_name"
    ).length,
    no_csv_row_matching_ibge_normalized_name: missingDetailed.filter(
      (m) => m.reason === "no_csv_row_matching_ibge_normalized_name"
    ).length,
  };

  const withSolar = await db.city.count({
    where: { NOT: { solarResource: { equals: Prisma.DbNull } } },
  });

  const report = {
    generatedAt: new Date().toISOString(),
    csvPath: path.relative(process.cwd(), csvPath),
    summary: {
      ibgeCityCount: cities.length,
      csvDataRowCount: csvRows.length,
      csvRowsMatchedToCity: matchedRows,
      csvRowsOrphaned: orphanCsv,
      csvRowsSkippedAmbiguous: ambiguousCsv,
      citiesWithSolarResource: withSolar,
      citiesMissingSolarResource: missing.length,
    },
    bucketsCityMissingSolar: bucketCounts,
    samples: {
      orphanCsvRows: orphanSamples,
      ambiguousCsvKeys: ambiguousSamples,
      citiesMissingSolar: missingDetailed.slice(0, 80),
    },
    notes: [
      "Cities in bucket no_csv_row_matching_ibge_normalized_name: likely spelling differences vs INPE, municipalities created after the Atlas cut, or INPE seat label differing from current IBGE official name.",
      "INPE CC BY-NC-ND: do not reproduce the database for commercial purposes without INPE permission; cite the Atlas when using values.",
    ],
  };

  const reportPath = path.join(root, "data", "irradiation", REPORT_NAME);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report.summary, null, 2));
  console.log("Buckets (cities missing solar):", bucketCounts);
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
}

async function cli() {
  const prisma = new PrismaClient();
  try {
    await runSeedIrradiation(prisma);
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
