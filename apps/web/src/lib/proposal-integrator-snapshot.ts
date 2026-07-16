import type { GenerateKitResult } from "@/lib/kit-api";
import type { CostRuleRow } from "@/lib/cost-rules-api";
import {
  PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION,
  type ProposalIntegratorSourceType,
} from "@energivia/shared-types";
import { computeProjectCostSection, type ProjectCostRuleInput } from "@energivia/proposal-economia";

function mapCostRulesFromApi(rows: CostRuleRow[]): ProjectCostRuleInput[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    calculationType: r.calculationType,
    value: r.value,
    minKwp: r.minKwp,
    maxKwp: r.maxKwp,
    percentageBase: r.percentageBase ?? null,
  }));
}

export type BuildProposalIntegratorOptions = {
  organizationRules?: CostRuleRow[];
  systemKwp?: number;
  sourceType?: ProposalIntegratorSourceType;
  freight?: { state: string; valueBrl: number };
};

export function buildProposalIntegratorRenderedData(
  kit: GenerateKitResult | null,
  _quotedSaleFallbackBrl: number,
  notes?: string,
  opts?: BuildProposalIntegratorOptions
) {
  const orgRules = mapCostRulesFromApi(opts?.organizationRules ?? []);
  if (!kit?.kit_items?.length) {
    const systemKw =
      opts?.systemKwp != null && Number.isFinite(opts.systemKwp) && opts.systemKwp > 0
        ? opts.systemKwp
        : 0.5;
    const cost = computeProjectCostSection(0, systemKw, orgRules);
    const quoted = Math.max(1000, Math.round(cost.computedSaleFromCostRulesBrl * 100) / 100);
    return {
      integrator: {
        version: PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION,
        kitItems: [],
        equipmentSubtotalBrl: 0,
        quotedSaleBrl: quoted,
        systemPowerKw: systemKw,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
        projectCostLines: cost.projectCostLines,
        ...(cost.defaultEssentialCostNames.length
          ? { defaultEssentialCostNames: cost.defaultEssentialCostNames }
          : {}),
        computedSaleFromCostRulesBrl: cost.computedSaleFromCostRulesBrl,
      },
    };
  }

  const kitItems = kit.kit_items.map((l) => {
    const lineTotal = Math.round(l.quantity * l.unit_price * 100) / 100;
    return {
      productId: l.product_id,
      productName: l.product_name,
      brandName: l.brand_name,
      quantity: l.quantity,
      unitPrice: l.unit_price,
      lineTotal,
    };
  });
  const equipmentSubtotalBrl =
    Math.round(kitItems.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;

  const systemKw =
    opts?.systemKwp != null && Number.isFinite(opts.systemKwp) && opts.systemKwp > 0
      ? opts.systemKwp
      : kit.system_power_kw;

  const cost = computeProjectCostSection(equipmentSubtotalBrl, systemKw, orgRules);

  const freightBrl =
    opts?.freight && Number.isFinite(opts.freight.valueBrl) && opts.freight.valueBrl > 0
      ? Math.round(opts.freight.valueBrl * 100) / 100
      : 0;
  const freightState = freightBrl > 0 ? opts!.freight!.state : undefined;
  const computedWithFreight =
    Math.round((cost.computedSaleFromCostRulesBrl + freightBrl) * 100) / 100;
  const quoted = Math.max(1000, computedWithFreight);
  const freightLines =
    freightState != null
      ? [
          {
            ruleId: null,
            name: `Frete (${freightState})`,
            calculationType: "FIXED" as const,
            value: freightBrl,
            appliedAmountBrl: freightBrl,
            source: "organization" as const,
          },
        ]
      : [];

  return {
    integrator: {
      version: PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION,
      kitItems,
      equipmentSubtotalBrl,
      quotedSaleBrl: quoted,
      systemPowerKw: kit.system_power_kw,
      ...(opts?.sourceType ? { sourceType: opts.sourceType } : {}),
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
      projectCostLines: [...cost.projectCostLines, ...freightLines],
      ...(freightState != null ? { freightState, freightBrl } : {}),
      ...(cost.defaultEssentialCostNames.length
        ? { defaultEssentialCostNames: cost.defaultEssentialCostNames }
        : {}),
      computedSaleFromCostRulesBrl: computedWithFreight,
    },
  };
}
