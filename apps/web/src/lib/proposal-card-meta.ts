import type { FinancialSimulationInputJson } from "@/lib/leads-api";

function readIntegratorNumber(renderedData: unknown, key: string): number | null {
  if (!renderedData || typeof renderedData !== "object" || !("integrator" in renderedData)) {
    return null;
  }
  const integ = (renderedData as { integrator?: unknown }).integrator;
  if (!integ || typeof integ !== "object") return null;
  const v = (integ as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function proposalQuotedTotalBrl(
  renderedData: unknown | null | undefined,
  simulationInput: unknown | null | undefined
): number | null {
  const quoted = readIntegratorNumber(renderedData, "quotedSaleBrl");
  if (quoted != null && quoted > 0) return quoted;
  if (simulationInput && typeof simulationInput === "object") {
    const inv = (simulationInput as FinancialSimulationInputJson).investmentAmount;
    if (typeof inv === "number" && Number.isFinite(inv) && inv > 0) return inv;
  }
  return null;
}

export function proposalSystemPowerKw(renderedData: unknown | null | undefined): number | null {
  const kw = readIntegratorNumber(renderedData, "systemPowerKw");
  return kw != null && kw > 0 ? kw : null;
}

export function proposalSystemSizeKwFromSimulation(
  simulationInput: unknown | null | undefined
): number | null {
  if (!simulationInput || typeof simulationInput !== "object") return null;
  const kw = (simulationInput as FinancialSimulationInputJson).systemSizeKw;
  return typeof kw === "number" && Number.isFinite(kw) && kw > 0 ? kw : null;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  VIEWED: "Visualizada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

export function proposalStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function proposalStatusPillClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  switch (status) {
    case "ACCEPTED":
      return `${base} border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300`;
    case "REJECTED":
      return `${base} border-red-500/35 bg-red-500/10 text-red-800 dark:text-red-300`;
    case "SENT":
    case "VIEWED":
      return `${base} border-[var(--color-secondary-300)] bg-[var(--color-secondary-100)] text-[var(--color-secondary-800)] dark:border-[var(--color-border)] dark:bg-[var(--color-secondary-800)]/35 dark:text-[var(--color-secondary-200)]`;
    case "DRAFT":
    default:
      return `${base} border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)]`;
  }
}

export function formatProposalDatePt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
