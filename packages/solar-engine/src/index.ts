import type {
  GenerateSolarKitsInput,
  GenerateSolarKitsOutput,
  KitPreferences,
  RoofType,
  KitSuggestion,
} from "@energivia/shared-types";

const DEFAULT_MODULE_BRAND = "Canadian Solar";
const DEFAULT_INVERTER_BRAND = "Growatt";
const DEFAULT_PR = 0.8;
const DEFAULT_CITY_SOLAR_INDEX = 4.8;
const ROOF_TYPE_FACTOR: Record<RoofType, number> = {
  ceramic: 1,
  metal: 1.03,
  fibromadeira: 0.97,
  fibrometal: 0.97,
  ground: 1.08,
  laje: 1.05,
};

const CITY_SOLAR_INDEX: Record<string, number> = {
  "maringa,pr": 5.2,
  "curitiba,pr": 4.6,
  "londrina,pr": 5.1,
  "sao paulo,sp": 4.7,
  "rio de janeiro,rj": 5.0,
  "belo horizonte,mg": 5.4,
  "goiania,go": 5.6,
  "campo grande,ms": 5.5,
  "brasilia,df": 5.5,
  "salvador,ba": 5.4,
  "recife,pe": 5.3,
  "fortaleza,ce": 5.7,
  "porto alegre,rs": 4.7,
};

const STATE_SOLAR_INDEX: Record<string, number> = {
  pr: 4.9,
  sp: 4.8,
  rj: 5.0,
  mg: 5.3,
  go: 5.6,
  ms: 5.5,
  df: 5.5,
  ba: 5.4,
  pe: 5.3,
  ce: 5.7,
  rs: 4.8,
  sc: 4.9,
};

function calculateBaseSystemKw(monthlyConsumption: number): number {
  const safetyFactor = 1.2;
  const productivityPerKwMonth = 130;
  return (monthlyConsumption * safetyFactor) / productivityPerKwMonth;
}

function applyPreferenceFactor(baseKw: number, preferences?: KitPreferences): number {
  if (!preferences) return baseKw;
  if (preferences.cheaper) return baseKw * 0.92;
  if (preferences.moreGeneration) return baseKw * 1.1;
  return baseKw;
}

function roundToHalf(kw: number): number {
  return Math.round(kw * 2) / 2;
}

function normalizeLocation(location: string): string {
  if (!location) return "";
  return location
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getCitySolarIndex(location: string): number {
  const normalized = normalizeLocation(location);
  const compactKey = normalized.replace(", ", ",");
  const cityIndex = CITY_SOLAR_INDEX[compactKey];
  if (cityIndex) return cityIndex;

  const stateCandidate = normalized.split(",").pop()?.trim();
  if (stateCandidate && stateCandidate.length === 2) {
    return STATE_SOLAR_INDEX[stateCandidate] ?? DEFAULT_CITY_SOLAR_INDEX;
  }

  return DEFAULT_CITY_SOLAR_INDEX;
}

function generationFromKw(kw: number, citySolarIndex: number, performanceRatio: number): number {
  return Math.round(kw * citySolarIndex * 30 * performanceRatio);
}

function moduleCountFromKw(kw: number): number {
  const modulePowerKw = 0.55;
  return Math.max(1, Math.round(kw / modulePowerKw));
}

function modulePowerWFromKw(kw: number, modules: number): number | undefined {
  if (modules <= 0) return undefined;
  const watts = Math.round((kw * 1000) / modules);
  return watts > 0 ? watts : undefined;
}

function inverterName(brand: string, kw: number): string {
  return `${brand} ${Math.floor(kw)}kW`;
}

function buildKit(
  label: KitSuggestion["label"],
  sizeKw: number,
  netConsumption: number,
  moduleBrand: string,
  inverterBrand: string,
  priceMultiplier: number,
  citySolarIndex: number,
  performanceRatio: number
): KitSuggestion {
  const modules = moduleCountFromKw(sizeKw);
  const modulePowerW = modulePowerWFromKw(sizeKw, modules);
  const monthlyGeneration = generationFromKw(sizeKw, citySolarIndex, performanceRatio);
  const price = Math.round(sizeKw * 4300 * priceMultiplier);

  return {
    label,
    systemSize: `${sizeKw.toFixed(1)}kWp`,
    modules,
    modulePowerW,
    moduleBrand,
    inverter: inverterName(inverterBrand, sizeKw),
    estimatedGeneration: `${monthlyGeneration} kWh/mês`,
    estimatedPrice: price,
    citySolarIndexKwhM2Day: citySolarIndex,
    performanceRatio,
    indexSource: "Base interna Energivia (cidade/UF)",
    targetKWp: sizeKw,
    netConsumption: netConsumption
  };
}

export function generateSolarKits(input: GenerateSolarKitsInput): GenerateSolarKitsOutput {
  const performanceRatio = DEFAULT_PR;
  
  // ETAPA 2.A: Tratamento do histórico
  let cMedio = input.monthlyConsumption;
  if (input.history && Array.isArray(input.history) && input.history.length > 0) {
    const validMonths = input.history.filter(h => h > 0);
    if (validMonths.length > 0) {
      const sum = validMonths.reduce((acc, val) => acc + val, 0);
      cMedio = sum / validMonths.length;
    }
  }

  // ETAPA 2.B: Custo de Disponibilidade
  let custoDisponibilidade = 50; // Bifásico por padrão se nada for fornecido
  if (input.connectionType) {
    const conn = input.connectionType.toLowerCase();
    if (conn.includes("mono")) custoDisponibilidade = 30;
    else if (conn.includes("tri")) custoDisponibilidade = 100;
  }

  // ETAPA 3.2: Consumo a Compensar
  const cCompensar = Math.max(0, cMedio - custoDisponibilidade);

  // ETAPA 3.3: Índice HSP
  const citySolarIndex = getCitySolarIndex(input.location);

  // ETAPA 3.5: Cálculo da Potência do Sistema (kWp)
  let pKwp = 0;
  if (cCompensar > 0) {
    pKwp = cCompensar / (citySolarIndex * 30 * performanceRatio);
  }

  // Se P_kWp zerar (consumo muito baixo), fallback para o mínimo (1 painel)
  if (pKwp <= 0) pKwp = 0.55;

  const roofAdjustedBase = pKwp * ROOF_TYPE_FACTOR[input.roofType];
  const adjusted = applyPreferenceFactor(roofAdjustedBase, input.preferences);

  const moduleBrand = input.preferences?.moduleBrand || DEFAULT_MODULE_BRAND;
  const inverterBrand = input.preferences?.inverterBrand || DEFAULT_INVERTER_BRAND;

  const kits: KitSuggestion[] = [
    buildKit(
      "Melhor Custo-Benefício",
      adjusted,
      cCompensar,
      moduleBrand,
      inverterBrand,
      1,
      citySolarIndex,
      performanceRatio
    ),
    buildKit(
      "Menor Preço",
      Math.max(0.55, adjusted - 0.5),
      cCompensar,
      input.preferences?.moduleBrand || "JA Solar",
      "Solis",
      0.92,
      citySolarIndex,
      performanceRatio
    ),
    buildKit(
      "Premium",
      adjusted + 0.5,
      cCompensar,
      moduleBrand,
      "Fronius",
      1.15,
      citySolarIndex,
      performanceRatio
    ),
  ];

  return { kits };
}
