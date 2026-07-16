import type {
  DealStage,
  DealWithProposals,
  EnergyBillRecord,
  FinancialSimulationInputJson,
  FinancialSimulationResultJson,
  LeadDetail,
  SimulationListItem,
} from "@/lib/leads-api";
import { simulationHasEmbeddedSizing } from "@/lib/leads-api";
import type { Deal } from "@/lib/pipeline-deal";
import { formatNextStepSummary } from "@/lib/lead-activity";
import { STAGE_LABEL } from "@/app/(authenticated)/leads/deal-stage-badge";

export type PrimaryCtaKind =
  | "simulate_economy"
  | "create_opportunity"
  | "create_proposal"
  | "send_proposal"
  | "open_proposal";

export type PrimaryCta = {
  kind: PrimaryCtaKind;
  label: string;
  proposalId?: string;
};

function formatWhatsappLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") ? `+${d}` : `+55${d}`;
}

function mapApiStageToPipeline(stage: DealStage | null): Deal["stage"] {
  switch (stage) {
    case "NEW":
      return "novo";
    case "CONTACTED":
      return "contato";
    case "PROPOSAL":
      return "proposta";
    case "NEGOTIATION":
      return "negociacao";
    case "WON":
    case "LOST":
      return "fechado";
    default:
      return "novo";
  }
}

export function pickActiveDeal(deals: DealWithProposals[]): DealWithProposals | null {
  if (!deals.length) return null;
  const open = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const pool = open.length ? open : deals;
  return [...pool].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]!;
}

export function buildPipelineDealForApiDeal(
  lead: LeadDetail,
  deal: DealWithProposals | null
): Deal {
  const whatsappLabel = formatWhatsappLabel(lead.whatsapp);
  const top = deal;
  const nextDate = top?.nextActionAt ? new Date(top.nextActionAt) : new Date(lead.updatedAt);
  const estimatedValueRaw = top?.value ? Number(top.value) : 0;
  return {
    id: lead.id,
    leadId: lead.id,
    dealId: top?.id ?? null,
    clientName: lead.name,
    contact: lead.email?.trim() || whatsappLabel || "Sem contato",
    whatsapp: lead.whatsapp ?? null,
    stage: mapApiStageToPipeline(top?.stage ?? null),
    order: 0,
    value: Number.isFinite(estimatedValueRaw) ? estimatedValueRaw : 0,
    nextStepDate: nextDate,
    recentAt: new Date(lead.updatedAt),
    hasProposal: top ? top.proposals.length > 0 : false,
  };
}

export function hasCompletedBill(bills: EnergyBillRecord[] | undefined): boolean {
  return Boolean(bills?.some((b) => b.extractionStatus === "COMPLETED"));
}

export function hasUsableSimulation(sims: SimulationListItem[]): boolean {
  return sims.some((s) => simulationHasEmbeddedSizing(s));
}

export function pickBestSimulation(sims: SimulationListItem[]): SimulationListItem | null {
  if (!sims.length) return null;
  const withSizing = sims.find((s) => simulationHasEmbeddedSizing(s));
  return withSizing ?? sims[0] ?? null;
}

export function formatBrl(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function temperatureLabel(t: string | null | undefined): string {
  switch (t) {
    case "HOT":
      return "Quente";
    case "WARM":
      return "Morna";
    case "COLD":
      return "Fria";
    default:
      return "—";
  }
}

export function temperatureEmoji(t: string | null | undefined): string {
  switch (t) {
    case "HOT":
      return "🔥";
    case "WARM":
      return "🟡";
    case "COLD":
      return "❄️";
    default:
      return "";
  }
}

export function stageStatusHeadline(deal: DealWithProposals): string {
  const proposalSent = deal.proposals.some((p) => Boolean(p.sentAt) || p.status === "SENT");
  switch (deal.stage) {
    case "NEW":
      return "Nova oportunidade";
    case "CONTACTED":
      return "Contato em andamento";
    case "PROPOSAL":
      return proposalSent ? "Proposta enviada" : "Proposta em andamento";
    case "NEGOTIATION":
      return "Em negociação";
    case "WON":
      return "Negócio ganho";
    case "LOST":
      return "Negócio perdido";
    default:
      return "Oportunidade";
  }
}

export function dealStageAccent(deal: DealWithProposals): {
  bar: string;
  iconBg: string;
  iconColor: string;
} {
  switch (deal.stage) {
    case "NEW":
      return {
        bar: "var(--color-secondary-400)",
        iconBg: "rgba(100, 116, 139, 0.12)",
        iconColor: "var(--color-secondary-600)",
      };
    case "CONTACTED":
      return {
        bar: "#3b82f6",
        iconBg: "rgba(59, 130, 246, 0.12)",
        iconColor: "#1d4ed8",
      };
    case "PROPOSAL":
      return {
        bar: "var(--color-warning)",
        iconBg: "rgba(253, 224, 71, 0.35)",
        iconColor: "var(--color-warning-dark)",
      };
    case "NEGOTIATION":
      return {
        bar: "#f97316",
        iconBg: "rgba(249, 115, 22, 0.12)",
        iconColor: "#c2410c",
      };
    case "WON":
      return {
        bar: "var(--color-success)",
        iconBg: "var(--color-primary-50)",
        iconColor: "var(--color-success-dark)",
      };
    case "LOST":
      return {
        bar: "var(--color-destructive)",
        iconBg: "rgba(239, 68, 68, 0.1)",
        iconColor: "var(--color-error-dark)",
      };
    default:
      return {
        bar: "var(--color-border)",
        iconBg: "var(--color-muted)",
        iconColor: "var(--color-muted-foreground)",
      };
  }
}

export function temperatureBadgeStyle(t: string | null | undefined): {
  bg: string;
  color: string;
  border: string;
} {
  switch (t) {
    case "HOT":
      return {
        bg: "rgba(239, 68, 68, 0.1)",
        color: "var(--color-error-dark)",
        border: "1px solid rgba(239, 68, 68, 0.28)",
      };
    case "WARM":
      return {
        bg: "rgba(234, 179, 8, 0.14)",
        color: "var(--color-warning-dark)",
        border: "1px solid rgba(234, 179, 8, 0.4)",
      };
    case "COLD":
      return {
        bg: "rgba(59, 130, 246, 0.1)",
        color: "#1d4ed8",
        border: "1px solid rgba(59, 130, 246, 0.28)",
      };
    default:
      return {
        bg: "var(--color-muted)",
        color: "var(--color-muted-foreground)",
        border: "1px solid var(--color-border)",
      };
  }
}

export function nextActionDisplay(
  deal: DealWithProposals | null,
  soonestNext: DealWithProposals | null
): string {
  return formatNextStepSummary(
    soonestNext?.nextActionAt ?? null,
    soonestNext?.nextActionType ?? null,
    deal?.stage ?? null
  );
}

export function pickSoonestNextDeal(deals: DealWithProposals[]): DealWithProposals | null {
  const active = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  let best: DealWithProposals | null = null;
  for (const d of active) {
    if (!d.nextActionAt) continue;
    const t = new Date(d.nextActionAt).getTime();
    if (!best || t < new Date(best.nextActionAt!).getTime()) best = d;
  }
  return best;
}

export function computeSalesProgress(
  activeDeal: DealWithProposals | null,
  simulations: SimulationListItem[]
): {
  leadCreated: boolean;
  simulationDone: boolean;
  dealCreated: boolean;
  proposalDone: boolean;
  followUpDone: boolean;
} {
  return {
    leadCreated: true,
    simulationDone: hasUsableSimulation(simulations),
    dealCreated: Boolean(activeDeal),
    proposalDone: Boolean(activeDeal && activeDeal.proposals.length > 0),
    followUpDone: Boolean(
      activeDeal?.lastContactAt &&
      activeDeal?.nextActionAt &&
      new Date(activeDeal.lastContactAt).getTime() >= new Date(activeDeal.nextActionAt).getTime()
    ),
  };
}

export function formatKwpForDealTitle(kwRaw: number): string {
  if (!Number.isFinite(kwRaw)) return "0";
  const cents = Math.round(kwRaw * 100);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const frac = abs % 100;
  const intFmt = intPart.toLocaleString("pt-BR");
  if (frac === 0) {
    return negative ? `-${intFmt}` : intFmt;
  }
  const fracStr = frac < 10 ? `0${frac}` : String(frac);
  return `${negative ? "-" : ""}${intFmt},${fracStr}`;
}

export function buildSystemDealTitle(kwRaw: number): string {
  return `Sistema ${formatKwpForDealTitle(kwRaw)} kWp`;
}

export function buildAutoDealPayloadFromSimulation(sim: SimulationListItem): {
  title: string;
  value: number;
} {
  const input = sim.input as FinancialSimulationInputJson | undefined;
  const result = sim.result as FinancialSimulationResultJson | undefined;
  const kwRaw =
    typeof input?.systemSizeKw === "number" && Number.isFinite(input.systemSizeKw)
      ? input.systemSizeKw
      : typeof result?.sizing?.recommendedPowerKw === "number"
        ? result.sizing.recommendedPowerKw
        : 0;
  const investment =
    typeof input?.investmentAmount === "number" && Number.isFinite(input.investmentAmount)
      ? input.investmentAmount
      : 0;
  return {
    title: buildSystemDealTitle(kwRaw),
    value: investment,
  };
}

export function resolvePrimaryCta(
  activeDeal: DealWithProposals | null,
  simulations: SimulationListItem[]
): PrimaryCta {
  if (!hasUsableSimulation(simulations)) {
    return { kind: "simulate_economy", label: "Simular economia" };
  }
  if (!activeDeal) {
    return { kind: "create_opportunity", label: "Criar oportunidade" };
  }
  if (activeDeal.proposals.length === 0) {
    return { kind: "create_proposal", label: "Criar proposta" };
  }
  const draft = activeDeal.proposals.find((p) => p.status === "DRAFT");
  if (draft) {
    return {
      kind: "send_proposal",
      label: "Enviar proposta no WhatsApp",
      proposalId: draft.id,
    };
  }
  const first = activeDeal.proposals[0];
  return {
    kind: "open_proposal",
    label: "Compartilhar proposta com cliente",
    proposalId: first?.id,
  };
}

export function parseSimulationMetrics(sim: SimulationListItem | null): {
  consumptionKwh: string;
  systemKw: string;
  monthlySavings: string;
  paybackYears: string;
} {
  if (!sim?.result || typeof sim.result !== "object") {
    return { consumptionKwh: "—", systemKw: "—", monthlySavings: "—", paybackYears: "—" };
  }
  const res = sim.result as FinancialSimulationResultJson;
  const input = sim.input as FinancialSimulationInputJson | undefined;
  const sizingIn = input?.sizing;
  let cons = "—";
  if (typeof sizingIn?.monthlyConsumptionKwh === "number") {
    cons = `${Math.round(sizingIn.monthlyConsumptionKwh)} kWh/mês`;
  }
  const sysKw =
    typeof input?.systemSizeKw === "number"
      ? `${input.systemSizeKw} kWp`
      : typeof res.sizing?.recommendedPowerKw === "number"
        ? `${res.sizing.recommendedPowerKw} kWp`
        : "—";
  const monthly =
    typeof res.monthlySavings === "number"
      ? res.monthlySavings.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }) + "/mês"
      : "—";
  const pay =
    typeof res.paybackYears === "number" && Number.isFinite(res.paybackYears)
      ? `${res.paybackYears.toFixed(1).replace(".", ",")} anos`
      : "—";
  return {
    consumptionKwh: cons,
    systemKw: sysKw,
    monthlySavings: monthly,
    paybackYears: pay,
  };
}

export function getRecommendedSalesBlock(p: {
  simulationDone: boolean;
  dealCreated: boolean;
  proposalDone: boolean;
  followUpDone: boolean;
}): {
  showAction: boolean;
  stepTitle: string;
  stepDescription: string;
} {
  if (!p.simulationDone) {
    return {
      showAction: true,
      stepTitle: "Simular economia e payback",
      stepDescription:
        "Descubra quanto o cliente pode economizar por mês e o tempo de retorno do investimento.",
    };
  }
  if (!p.dealCreated) {
    return {
      showAction: true,
      stepTitle: "Transformar em oportunidade",
      stepDescription:
        "Use a simulação para acompanhar valor, estágio e fechar a venda com o cliente.",
    };
  }
  if (!p.proposalDone) {
    return {
      showAction: true,
      stepTitle: "Gerar proposta comercial",
      stepDescription: "Monte a proposta vinculada ao negócio e à simulação escolhida.",
    };
  }
  if (!p.followUpDone) {
    return {
      showAction: true,
      stepTitle: "Realizar follow-up",
      stepDescription: "Conclua o contato agendado ou reagende o próximo passo com o cliente.",
    };
  }
  return {
    showAction: false,
    stepTitle: "Funil em dia",
    stepDescription: "Continue o relacionamento e acompanhe o retorno do cliente.",
  };
}

export const DEAL_STAGES: DealStage[] = [
  "NEW",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export { STAGE_LABEL };
