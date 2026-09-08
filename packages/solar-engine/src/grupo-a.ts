/**
 * Motor Solar Grupo A (Média e Alta Tensão)
 *
 * Dimensionamento e análise de viabilidade financeira para indústrias,
 * comércios de grande porte e produtores rurais atendidos em subestação
 * sob as modalidades Tarifa Verde e Tarifa Azul.
 */

export type GrupoAModality = "VERDE" | "AZUL";
export type GrupoASubgroup = "A4" | "A3a" | "A3" | "A2" | "A1";

export interface GrupoASimulationInput {
  subgroup?: GrupoASubgroup;
  modality: GrupoAModality;
  /** Demanda contratada única em kW (para Tarifa Verde) */
  contractedDemandKw?: number;
  /** Demanda contratada na Ponta em kW (para Tarifa Azul) */
  contractedDemandPeakKw?: number;
  /** Demanda contratada Fora de Ponta em kW (para Tarifa Azul) */
  contractedDemandOffPeakKw?: number;
  /** Tarifa de demanda em R$/kW (Verde ou Demanda Única) */
  demandTariffBrlPerKw: number;
  /** Tarifa de demanda Fora de Ponta em R$/kW (específica Azul se houver) */
  demandOffPeakTariffBrlPerKw?: number;
  /** Consumo mensal no horário de Ponta em kWh */
  peakConsumptionKwh: number;
  /** Tarifa de energia na Ponta em R$/kWh */
  peakTariffBrlPerKwh: number;
  /** Consumo mensal no horário Fora de Ponta em kWh */
  offPeakConsumptionKwh: number;
  /** Tarifa de energia Fora de Ponta em R$/kWh */
  offPeakTariffBrlPerKwh: number;
  /** Horas de Sol Pleno (HSP) diárias na localidade (ex: 5.0 kWh/m²/dia) */
  solarIrradianceHsp?: number;
  /** Performance Ratio da usina (padrão: 0.78 para usinas de solo/telhado industrial) */
  performanceRatio?: number;
  /** Potência do sistema que se deseja simular em kWp (se omitido, dimensiona usina ótima) */
  customSystemPowerKw?: number;
}

export interface GrupoASimulationResult {
  modality: GrupoAModality;
  /** Fator de equivalência energética de créditos: Tarifa_FP / Tarifa_Ponta */
  peakToOffPeakEquivalenceRatio: number;
  /** Consumo total mensal equivalente em Fora de Ponta para zerar a conta de consumo */
  equivalentTotalOffPeakKwh: number;
  /** Potência recomendada da usina fotovoltaica em kWp */
  recommendedSystemPowerKw: number;
  /** Geração mensal estimada da usina em kWh (ocorre 100% no horário Fora de Ponta) */
  estimatedMonthlyGenerationKwh: number;
  /** Custo da demanda contratada (fixo da concessionária não abatido por solar) em R$ */
  monthlyDemandCostBrl: number;
  /** Fatura mensal original da concessionária sem usina solar em R$ */
  originalMonthlyBillBrl: number;
  /** Nova fatura mensal estimada com usina solar (demanda + ponta residual) em R$ */
  newMonthlyBillBrl: number;
  /** Economia mensal em R$ */
  monthlySavingsBrl: number;
  /** Economia anual estimada em R$ */
  annualSavingsBrl: number;
  /** Percentual de redução na fatura total de energia (%) */
  billReductionPercentage: number;
}

/**
 * Calcula o fator de equivalência energética de créditos da geração Fora de Ponta
 * para compensação do consumo na Ponta.
 * Exemplo: se Tarifa FP = 0.50 e Ponta = 2.00, ratio = 0.25 (são necessários 4 kWh em FP para abater 1 kWh em Ponta).
 */
export function calculatePeakCreditEquivalenceRatio(
  offPeakTariff: number,
  peakTariff: number
): number {
  if (peakTariff <= 0 || offPeakTariff <= 0) return 1.0;
  return Math.round((offPeakTariff / peakTariff) * 10000) / 10000;
}

/**
 * Simula a economia e o dimensionamento fotovoltaico para clientes do Grupo A.
 */
export function simulateGrupoASolar(input: GrupoASimulationInput): GrupoASimulationResult {
  const hsp =
    input.solarIrradianceHsp && input.solarIrradianceHsp > 0 ? input.solarIrradianceHsp : 4.8;
  const pr = input.performanceRatio && input.performanceRatio > 0 ? input.performanceRatio : 0.78;

  const peakKwh = Math.max(0, input.peakConsumptionKwh);
  const offPeakKwh = Math.max(0, input.offPeakConsumptionKwh);

  const peakTariff = Math.max(0.01, input.peakTariffBrlPerKwh);
  const offPeakTariff = Math.max(0.01, input.offPeakTariffBrlPerKwh);

  // 1. Custo de demanda
  let monthlyDemandCost = 0;
  if (input.modality === "AZUL") {
    const demPeakKw = input.contractedDemandPeakKw ?? input.contractedDemandKw ?? 0;
    const demOffPeakKw = input.contractedDemandOffPeakKw ?? input.contractedDemandKw ?? 0;
    const demOffTariff = input.demandOffPeakTariffBrlPerKw ?? input.demandTariffBrlPerKw;
    monthlyDemandCost = demPeakKw * input.demandTariffBrlPerKw + demOffPeakKw * demOffTariff;
  } else {
    // Tarifa Verde
    const demKw = input.contractedDemandKw ?? 0;
    monthlyDemandCost = demKw * input.demandTariffBrlPerKw;
  }

  // 2. Fatura original sem solar
  const originalConsumptionCost = peakKwh * peakTariff + offPeakKwh * offPeakTariff;
  const originalMonthlyBill = Math.round((monthlyDemandCost + originalConsumptionCost) * 100) / 100;

  // 3. Fator de equivalência energética Ponta -> Fora de Ponta
  const equivalenceRatio = calculatePeakCreditEquivalenceRatio(offPeakTariff, peakTariff);

  // Quantos kWh em Fora de Ponta são necessários para suprir tanto o FP quanto a Ponta
  const neededForPeakInOffPeakTerms = peakKwh / equivalenceRatio;
  const equivalentTotalOffPeakKwh = Math.round(offPeakKwh + neededForPeakInOffPeakTerms);

  // 4. Produtividade mensal por kWp
  // kWh/mês = kWp * HSP * 30 dias * PR
  const productivityPerKwpMonth = hsp * 30 * pr;

  // 5. Potência recomendada
  let recommendedSystemPowerKw = 0;
  if (input.customSystemPowerKw && input.customSystemPowerKw > 0) {
    recommendedSystemPowerKw = input.customSystemPowerKw;
  } else {
    recommendedSystemPowerKw =
      productivityPerKwpMonth > 0
        ? Math.round((equivalentTotalOffPeakKwh / productivityPerKwpMonth) * 10) / 10
        : 0;
  }

  // 6. Geração estimada da usina
  const estimatedMonthlyGeneration =
    Math.round(recommendedSystemPowerKw * productivityPerKwpMonth * 10) / 10;

  // 7. Balanço de compensação
  // A usina gera exclusivamente em horário Fora de Ponta
  const generationUsedForOffPeak = Math.min(offPeakKwh, estimatedMonthlyGeneration);
  const surplusForPeak = Math.max(0, estimatedMonthlyGeneration - generationUsedForOffPeak);

  // O excedente de FP abate a Ponta na proporção da equivalência
  const peakAbatedKwh = Math.min(peakKwh, surplusForPeak * equivalenceRatio);
  const remainingPeakKwh = Math.max(0, peakKwh - peakAbatedKwh);
  const remainingOffPeakKwh = Math.max(0, offPeakKwh - generationUsedForOffPeak);

  const newConsumptionCost = remainingPeakKwh * peakTariff + remainingOffPeakKwh * offPeakTariff;
  const newMonthlyBill = Math.round((monthlyDemandCost + newConsumptionCost) * 100) / 100;

  const monthlySavings = Math.max(
    0,
    Math.round((originalMonthlyBill - newMonthlyBill) * 100) / 100
  );
  const annualSavings = Math.round(monthlySavings * 12 * 100) / 100;
  const billReductionPercentage =
    originalMonthlyBill > 0 ? Math.round((monthlySavings / originalMonthlyBill) * 1000) / 10 : 0;

  return {
    modality: input.modality,
    peakToOffPeakEquivalenceRatio: equivalenceRatio,
    equivalentTotalOffPeakKwh,
    recommendedSystemPowerKw,
    estimatedMonthlyGenerationKwh: estimatedMonthlyGeneration,
    monthlyDemandCostBrl: Math.round(monthlyDemandCost * 100) / 100,
    originalMonthlyBillBrl: originalMonthlyBill,
    newMonthlyBillBrl: newMonthlyBill,
    monthlySavingsBrl: monthlySavings,
    annualSavingsBrl: annualSavings,
    billReductionPercentage,
  };
}
