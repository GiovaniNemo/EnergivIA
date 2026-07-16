import type { DealStage } from "@/lib/leads-api";

export const STAGE_LABEL: Record<DealStage, string> = {
  NEW: "Novo",
  CONTACTED: "Contato",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
};

function dealStageBadgeClass(stage: DealStage): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide";
  switch (stage) {
    case "NEW":
      return `${base} border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]`;
    case "CONTACTED":
      return `${base} border-[var(--color-secondary-200)] bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)] dark:border-[var(--color-border)] dark:bg-[var(--color-secondary-800)]/35 dark:text-[var(--color-secondary-200)]`;
    case "PROPOSAL":
      return `${base} border-[var(--color-warning)]/40 bg-[var(--color-warning)]/14 text-[var(--color-warning-dark)] dark:border-[var(--color-warning)]/35 dark:bg-[var(--color-warning)]/12 dark:text-[var(--color-warning-light)]`;
    case "NEGOTIATION":
      return `${base} border-orange-500/35 bg-orange-500/10 text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/12 dark:text-orange-200`;
    case "WON":
      return `${base} border-[var(--color-success)]/45 bg-[var(--color-success)]/12 text-[var(--color-success-dark)] dark:border-[var(--color-success)]/40 dark:bg-[var(--color-success)]/15 dark:text-[var(--color-success)]`;
    case "LOST":
      return `${base} border-[var(--color-destructive)]/35 bg-[var(--color-error-light)]/30 text-[var(--color-error-dark)] dark:border-red-500/35 dark:bg-red-950/45 dark:text-red-200`;
    default:
      return `${base} border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]`;
  }
}

export function DealStageBadge({ stage, label }: { stage: DealStage | null; label?: string }) {
  if (!stage) {
    return (
      <span
        className="inline-flex shrink-0 items-center rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-[11px] font-medium leading-none text-[var(--color-muted-foreground)]"
        title="Nenhum negócio vinculado"
      >
        Sem negócio
      </span>
    );
  }
  return <span className={dealStageBadgeClass(stage)}>{label ?? STAGE_LABEL[stage]}</span>;
}
