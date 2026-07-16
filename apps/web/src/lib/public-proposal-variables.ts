import type { ProposalDocumentJson } from "@/components/proposals/editor/types";
import type { FinancialSimulationInputJson, FinancialSimulationResultJson } from "@/lib/leads-api";
import type { PublicProposalPayload } from "@/lib/public-proposals-api";

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function mergePublicProposalVariables(
  templateVariables: ProposalDocumentJson["variables"] | undefined,
  payload: PublicProposalPayload
): ProposalDocumentJson["variables"] {
  const merged: Record<string, string | number> = { ...templateVariables };

  merged["nome_cliente"] = payload.deal.lead.name;

  if (payload.companyName && payload.companyName.trim()) {
    merged["nome_empresa"] = payload.companyName.trim();
  }

  if (typeof payload.discountBrl === "number" && payload.discountBrl > 0) {
    merged["investimento_desconto"] = formatBRL(payload.discountBrl);
  } else {
    delete merged["investimento_desconto"];
  }

  const issued = payload.createdAt ? new Date(payload.createdAt) : new Date();
  merged["data_proposta"] = Number.isNaN(issued.getTime())
    ? new Date().toLocaleDateString("pt-BR")
    : issued.toLocaleDateString("pt-BR");

  const validUntil = new Date(payload.validUntil);
  merged["data_validade_proposta"] = Number.isNaN(validUntil.getTime())
    ? ""
    : validUntil.toLocaleDateString("pt-BR");

  const sim = payload.simulation;
  if (
    sim &&
    typeof sim.input === "object" &&
    sim.input !== null &&
    typeof sim.result === "object" &&
    sim.result !== null
  ) {
    const input = sim.input as FinancialSimulationInputJson;
    const result = sim.result as FinancialSimulationResultJson;

    merged["tamanho_sistema_kw"] = `${String(input.systemSizeKw)} kWp`;
    merged["potencia_sistema_kwp"] = input.systemSizeKw;
    merged["investimento_total"] = formatBRL(input.investmentAmount);
    merged["economia_mensal"] = formatBRL(result.monthlySavings);
    merged["payback_anos"] = `${String(result.paybackYears)} anos`;

    const annualRaw =
      Array.isArray(result.annualSavings) && result.annualSavings.length > 0
        ? result.annualSavings[0]
        : undefined;
    const annual =
      typeof annualRaw === "number" && Number.isFinite(annualRaw)
        ? annualRaw
        : result.monthlySavings * 12;
    merged["economia_anual"] = formatBRL(annual);

    if (input.annualIncreasePercent != null) {
      merged["taxa_reajuste_anual"] = String(input.annualIncreasePercent);
    }

    const sizingIn = input.sizing;
    const energyPrice = input.energyPriceKwh;
    if (sizingIn?.monthlyConsumptionKwh != null && energyPrice != null && energyPrice > 0) {
      merged["conta_mensal_energia"] = sizingIn.monthlyConsumptionKwh * energyPrice;
    }

    const sizingRes = result.sizing;
    if (sizingRes?.estimatedProductionKwhMonth != null) {
      const monthly = sizingRes.estimatedProductionKwhMonth;
      const annualKwh = monthly * 12;
      merged["geracao_mensal_kwh"] = Math.round(monthly);
      merged["producao_anual"] = `${Math.round(annualKwh).toLocaleString("pt-BR")} kWh/ano`;

      const CO2_KG_PER_KWH = 0.0817;
      const CO2_KG_PER_TREE_YEAR = 22;
      const trees = Math.round((annualKwh * CO2_KG_PER_KWH) / CO2_KG_PER_TREE_YEAR);
      if (Number.isFinite(trees) && trees > 0) merged["equivalente_arvores_ano"] = trees;
    }

    const components = sizingRes?.components ?? [];
    const findComponent = (needles: string[]) =>
      components.find((c) => needles.some((n) => c.type?.toLowerCase().includes(n)));
    const moduleComp = findComponent(["mod", "pain", "panel"]);
    const inverterComp = findComponent(["invers", "inverter"]);
    if (moduleComp) {
      merged["modulos_sistema"] = moduleComp.spec
        ? `${moduleComp.quantity}x ${moduleComp.spec}`
        : `${moduleComp.quantity} módulos`;
    } else if (sizingRes?.panelCount != null) {
      merged["modulos_sistema"] = `${sizingRes.panelCount} módulos`;
    }
    if (inverterComp) {
      merged["inversor_sistema"] = inverterComp.spec
        ? `${inverterComp.quantity}x ${inverterComp.spec}`
        : `${inverterComp.quantity} inversor(es)`;
    } else if (sizingRes?.inverterCount != null) {
      merged["inversor_sistema"] = `${sizingRes.inverterCount} inversor(es)`;
    }

    const monthlyBillRaw = merged["conta_mensal_energia"];
    const monthlyBill = typeof monthlyBillRaw === "number" ? monthlyBillRaw : null;
    if (monthlyBill != null && monthlyBill > 0) {
      merged["comparacao_antes"] = formatBRL(monthlyBill);
      merged["comparacao_depois"] = formatBRL(Math.max(0, monthlyBill - result.monthlySavings));
      const coverage = (result.monthlySavings / monthlyBill) * 100;
      if (Number.isFinite(coverage)) {
        merged["cobertura_consumo_pct"] = Math.min(100, Math.round(coverage));
      }
    }

    const investimento = input.investmentAmount;
    if (typeof investimento === "number" && investimento > 0) {
      const mesesCount = Number(merged["financiamento_meses_config"] ?? 96);
      const entradaTipo = String(merged["financiamento_entrada_tipo"] ?? "fixo");
      const entradaValor = Number(merged["financiamento_entrada_valor"] ?? 0);
      const entradaReais =
        entradaTipo === "percentual" ? investimento * (entradaValor / 100) : entradaValor;
      const valorFinanciado = Math.max(0, investimento - entradaReais);
      const parcelaMensal = mesesCount > 0 ? valorFinanciado / mesesCount : 0;
      merged["financiamento_parcela"] = formatBRL(parcelaMensal);
      merged["financiamento_meses"] = `${mesesCount} meses`;
      merged["financiamento_entrada"] = formatBRL(entradaReais);
    }
  }

  return merged;
}
