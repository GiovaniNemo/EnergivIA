/**
 * Motor de Cálculo Avançado - Lei 14.300/2022 (Marco Legal da GD)
 *
 * Regulamenta a transição tarifária do Fio B (TUSD Distribuição),
 * fatores de simultaneidade (autoconsumo instantâneo) e custos de
 * disponibilidade segundo os artigos 18 e 27 da Lei 14.300.
 */

export type ConnectionPhase = "monofasico" | "bifasico" | "trifasico";

export interface Lei14300Params {
  /** Ano de homologação/conexão da usina (ex: 2026) */
  connectionYear?: number;
  /** Consumo mensal do cliente em kWh */
  monthlyConsumptionKwh: number;
  /** Geração mensal estimada da usina em kWh */
  monthlyGenerationKwh: number;
  /** Tarifa cheia de energia em R$/kWh (TE + TUSD) */
  fullTariffBrlPerKwh: number;
  /** Tarifa do Fio B (TUSD Fio B) em R$/kWh (normalmente ~25% a 35% da TUSD total, ex: 0.28 R$/kWh) */
  wireBTariffBrlPerKwh?: number;
  /**
   * Fator de simultaneidade (autoconsumo instantâneo).
   * Fração de energia consumida no momento exato em que é gerada (0.0 a 1.0).
   * Padrões:
   * - Residencial: 0.30 (30%)
   * - Comercial diurno: 0.70 (70%)
   * - Industrial / Rural: 0.85 (85%)
   */
  simultaneityFactor?: number;
  /** Tipo de ligação na rede para cálculo da taxa mínima legal */
  connectionPhase?: ConnectionPhase;
  /** Iluminação pública e outros encargos fixos em R$ */
  publicLightingFeeBrl?: number;
}

export interface Lei14300MonthlyResult {
  /** Percentual do Fio B cobrado no ano (ex: 0.60 para 2026) */
  wireBPercentageApplied: number;
  /** Energia autoconsumida instantaneamente no local (kWh) - isenta de Fio B */
  instantSelfConsumptionKwh: number;
  /** Energia excedente injetada na rede da concessionária (kWh) */
  injectedKwh: number;
  /** Energia compensada da rede no mês (kWh) */
  compensatedKwh: number;
  /** Tarifa efetiva de compensação da energia injetada em R$/kWh */
  effectiveCompensationTariffBrl: number;
  /** Custo pago pelo Fio B da energia compensada em R$ */
  wireBCostBrl: number;
  /** Custo de disponibilidade mínimo da concessionária em R$ */
  availabilityCostBrl: number;
  /** Custo de disponibilidade efetivamente faturado após dedução do Fio B (Art. 18) */
  netAvailabilityFeeBrl: number;
  /** Nova conta de luz estimada com energia solar em R$ */
  newMonthlyBillBrl: number;
  /** Economia líquida mensal gerada pela usina em R$ */
  monthlySavingsBrl: number;
  /** Economia líquida anual estimada em R$ */
  annualSavingsBrl: number;
}

export interface LongTermProjectionYear {
  year: number;
  generationKwh: number;
  degradationFactor: number;
  tariffBrlPerKwh: number;
  wireBPercentage: number;
  annualSavingsBrl: number;
  cumulativeSavingsBrl: number;
}

export interface LongTermProjectionResult {
  projectionYears: LongTermProjectionYear[];
  total25YearsSavingsBrl: number;
  estimatedPaybackYears: number;
}

/**
 * Retorna o percentual legal de cobrança do Fio B conforme o Art. 27 da Lei 14.300.
 */
export function getLei14300WireBPercentage(year: number): number {
  if (year <= 2022) return 0; // GD I / Direito adquirido
  if (year === 2023) return 0.15;
  if (year === 2024) return 0.3;
  if (year === 2025) return 0.45;
  if (year === 2026) return 0.6;
  if (year === 2027) return 0.75;
  if (year === 2028) return 0.9;
  return 1.0; // 2029 em diante (100% do Fio B ou nova regulamentação Aneel)
}

/**
 * Retorna o consumo mínimo de disponibilidade em kWh conforme tipo de ligação.
 */
export function getAvailabilityKwhByPhase(phase: ConnectionPhase): number {
  switch (phase) {
    case "monofasico":
      return 30;
    case "bifasico":
      return 50;
    case "trifasico":
      return 100;
  }
}

/**
 * Calcula a simulação financeira mensal detalhada sob as regras da Lei 14.300/2022.
 */
export function calculateLei14300Monthly(params: Lei14300Params): Lei14300MonthlyResult {
  const currentYear = params.connectionYear ?? new Date().getFullYear();
  const wireBPercentage = getLei14300WireBPercentage(currentYear);
  const simultaneity = Math.min(1, Math.max(0, params.simultaneityFactor ?? 0.3));
  const fullTariff = params.fullTariffBrlPerKwh > 0 ? params.fullTariffBrlPerKwh : 0.85;

  // Se a tarifa de Fio B não for especificada, adota a média nacional da Aneel de 28% da tarifa cheia
  const wireBTariff =
    params.wireBTariffBrlPerKwh && params.wireBTariffBrlPerKwh > 0
      ? params.wireBTariffBrlPerKwh
      : fullTariff * 0.28;

  const generation = Math.max(0, params.monthlyGenerationKwh);
  const consumption = Math.max(0, params.monthlyConsumptionKwh);

  // 1. Autoconsumo instantâneo (ocorre no momento da geração e não passa pela rede)
  const potentialSelfConsumption = generation * simultaneity;
  const instantSelfConsumption = Math.min(consumption, potentialSelfConsumption);

  // 2. Energia injetada na rede da distribuidora
  const injected = Math.max(0, generation - instantSelfConsumption);

  // 3. Consumo restante puxado da rede da distribuidora
  const remainingGridConsumption = Math.max(0, consumption - instantSelfConsumption);

  // 4. Energia efetivamente compensada
  const compensated = Math.min(remainingGridConsumption, injected);

  // 5. Custo do Fio B sobre a energia compensada
  const wireBCost = compensated * wireBTariff * wireBPercentage;

  // 6. Tarifa líquida de compensação (o crédito da energia injetada vale a tarifa cheia menos o Fio B)
  const effectiveCompensationTariff = Math.max(0, fullTariff - wireBTariff * wireBPercentage);

  // 7. Custo de disponibilidade (Art. 18 da Lei 14.300)
  const phase = params.connectionPhase ?? "bifasico";
  const availabilityKwh = getAvailabilityKwhByPhase(phase);
  const grossAvailabilityCost = availabilityKwh * fullTariff;

  // Regra de não cumulatividade: desconta-se o valor cobrado de Fio B do custo de disponibilidade
  const netAvailabilityFee = Math.max(0, grossAvailabilityCost - wireBCost);

  // 8. Consumo da rede não compensado (se a usina gerar menos que o consumo)
  const uncompensatedGridKwh = Math.max(0, remainingGridConsumption - compensated);
  const uncompensatedEnergyCost = uncompensatedGridKwh * fullTariff;

  const publicLighting = params.publicLightingFeeBrl ?? 35;

  // Nova fatura da concessionária
  const newMonthlyBill = uncompensatedEnergyCost + wireBCost + netAvailabilityFee + publicLighting;

  // Fatura original sem energia solar
  const originalBill = Math.max(consumption, availabilityKwh) * fullTariff + publicLighting;

  const monthlySavings = Math.max(0, Math.round((originalBill - newMonthlyBill) * 100) / 100);
  const annualSavings = Math.round(monthlySavings * 12 * 100) / 100;

  return {
    wireBPercentageApplied: wireBPercentage,
    instantSelfConsumptionKwh: Math.round(instantSelfConsumption * 10) / 10,
    injectedKwh: Math.round(injected * 10) / 10,
    compensatedKwh: Math.round(compensated * 10) / 10,
    effectiveCompensationTariffBrl: Math.round(effectiveCompensationTariff * 10000) / 10000,
    wireBCostBrl: Math.round(wireBCost * 100) / 100,
    availabilityCostBrl: Math.round(grossAvailabilityCost * 100) / 100,
    netAvailabilityFeeBrl: Math.round(netAvailabilityFee * 100) / 100,
    newMonthlyBillBrl: Math.round(newMonthlyBill * 100) / 100,
    monthlySavingsBrl: monthlySavings,
    annualSavingsBrl: annualSavings,
  };
}

/**
 * Realiza projeção financeira de 25 anos com degradação anual dos módulos e inflação tarifária.
 */
export function projectLei14300LongTerm(
  params: Lei14300Params,
  systemInvestmentBrl: number,
  options?: {
    annualPanelDegradationRate?: number; // Padrão: 0.005 (0.5% a.a.)
    annualEnergyInflationRate?: number; // Padrão: 0.06 (6% a.a.)
    years?: number; // Padrão: 25
  }
): LongTermProjectionResult {
  const years = options?.years ?? 25;
  const degradationRate = options?.annualPanelDegradationRate ?? 0.005;
  const inflationRate = options?.annualEnergyInflationRate ?? 0.06;

  const startYear = params.connectionYear ?? new Date().getFullYear();
  const baseTariff = params.fullTariffBrlPerKwh > 0 ? params.fullTariffBrlPerKwh : 0.85;
  const baseGeneration = params.monthlyGenerationKwh;

  const projectionYears: LongTermProjectionYear[] = [];
  let cumulativeSavings = 0;
  let estimatedPaybackYears = 0;
  let paybackReached = false;

  for (let i = 0; i < years; i++) {
    const calendarYear = startYear + i;
    const degradationFactor = Math.pow(1 - degradationRate, i);
    const tariffInflationFactor = Math.pow(1 + inflationRate, i);

    const yearGeneration = baseGeneration * degradationFactor;
    const yearTariff = baseTariff * tariffInflationFactor;

    const monthlySim = calculateLei14300Monthly({
      ...params,
      connectionYear: calendarYear,
      monthlyGenerationKwh: yearGeneration,
      fullTariffBrlPerKwh: yearTariff,
      wireBTariffBrlPerKwh:
        (params.wireBTariffBrlPerKwh ?? baseTariff * 0.28) * tariffInflationFactor,
    });

    cumulativeSavings += monthlySim.annualSavingsBrl;

    if (!paybackReached && cumulativeSavings >= systemInvestmentBrl) {
      // Interpolação linear da fração do ano do payback
      const previousSavings = cumulativeSavings - monthlySim.annualSavingsBrl;
      const neededInYear = systemInvestmentBrl - previousSavings;
      const fraction =
        monthlySim.annualSavingsBrl > 0 ? neededInYear / monthlySim.annualSavingsBrl : 0;
      estimatedPaybackYears = Math.round((i + fraction) * 10) / 10;
      paybackReached = true;
    }

    projectionYears.push({
      year: calendarYear,
      generationKwh: Math.round(yearGeneration * 12),
      degradationFactor: Math.round(degradationFactor * 1000) / 1000,
      tariffBrlPerKwh: Math.round(yearTariff * 100) / 100,
      wireBPercentage: monthlySim.wireBPercentageApplied,
      annualSavingsBrl: Math.round(monthlySim.annualSavingsBrl),
      cumulativeSavingsBrl: Math.round(cumulativeSavings),
    });
  }

  if (!paybackReached && systemInvestmentBrl > 0 && cumulativeSavings > 0) {
    estimatedPaybackYears =
      Math.round((systemInvestmentBrl / (cumulativeSavings / years)) * 10) / 10;
  }

  return {
    projectionYears,
    total25YearsSavingsBrl: Math.round(cumulativeSavings),
    estimatedPaybackYears,
  };
}
