import type { DealStage } from "@/lib/leads-api";

export type ActivityTone = "fresh" | "recent" | "warn" | "danger";

export const ACTIVITY_TONE_DOT_CLASS: Record<ActivityTone, string> = {
  fresh: "bg-emerald-500",
  recent: "bg-[var(--color-muted-foreground)]/50",
  warn: "bg-amber-500",
  danger: "bg-red-500",
};

export const ACTIVITY_TONE_TEXT_CLASS: Record<ActivityTone, string> = {
  fresh: "text-emerald-700 dark:text-emerald-400 font-medium",
  recent: "text-[var(--color-muted-foreground)]",
  warn: "text-amber-800 dark:text-amber-300 font-medium",
  danger: "text-red-700 dark:text-red-400 font-semibold",
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function lastActivityPresentation(iso: string | null | undefined): {
  label: string;
  tone: ActivityTone;
} {
  if (!iso) return { label: "—", tone: "recent" };
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / 86400000);
  if (days < 0) return { label: "—", tone: "recent" };
  if (days === 0) return { label: "Hoje", tone: "fresh" };
  if (days === 1) return { label: "Ontem", tone: "recent" };
  if (days < 7) return { label: `${days} dias`, tone: "warn" };
  return { label: `${days} dias sem contato`, tone: "danger" };
}

export function formatNextStepSummary(
  iso: string | null,
  typeNote: string | null,
  stage: DealStage | null
): string {
  if (stage === "LOST") return "Reengajar";
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const d0 = startOfLocalDay(d);
  const n0 = startOfLocalDay(now);
  const tm0 = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const typeStr = typeNote?.trim() || "Próximo contato";
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d0 === n0) return `${typeStr} hoje às ${time}`;
  if (d0 === tm0) return `${typeStr} amanhã às ${time}`;
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${day} às ${time} · ${typeStr}`;
}
