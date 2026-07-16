"use client";

import { useState, useMemo } from "react";
import type { Deal, DealStage } from "./use-deals";

const STAGE_LABEL: Record<DealStage, string> = {
  novo: "Novo",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
};

const STALLED_DAYS_THRESHOLD = 7;

function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  return date.getTime() < Date.now();
}

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNextAction(date: Date | null): { label: string; overdue: boolean; soon: boolean } {
  if (!date) return { label: "Não agendado", overdue: false, soon: false };
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const overdue = date.getTime() < Date.now();
  const soon = !overdue && dayDiff <= 2;
  let label: string;
  if (dayDiff === 0) label = `Hoje ${time}`;
  else if (dayDiff === 1) label = `Amanhã ${time}`;
  else if (dayDiff === -1) label = `Ontem ${time}`;
  else label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${time}`;
  return { label, overdue, soon };
}

function urgencyScore(deal: Deal): number {
  let score = 0;
  const stalledDays = daysSince(deal.recentAt);
  if (isOverdue(deal.nextStepDate)) score += 1000;
  if (!deal.hasProposal) score += 250;
  if (deal.proposalFollowUpStatus === "waiting") score += 200;
  if (deal.proposalFollowUpStatus === "viewed") score += 160;
  score += Math.min(stalledDays, 30) * 8;
  if (deal.nextStepDate) {
    const hoursToNext = (deal.nextStepDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursToNext >= 0 && hoursToNext <= 48) score += 120;
  }
  return score;
}

function stagePillClass(stage: DealStage): string {
  switch (stage) {
    case "novo":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "contato":
      return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
    case "proposta":
      return "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400";
    case "negociacao":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "fechado":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

type SortKey = "urgency" | "empresa" | "valor" | "nextAction" | "daysInStage";
type SortDir = "asc" | "desc";

export interface TableViewProps {
  deals: Deal[];
  onOpenDeal?: (deal: Deal) => void;
}

export function PipelineTableView({ deals, onOpenDeal }: TableViewProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const openDeals = useMemo(() => deals.filter((d) => d.stage !== "fechado"), [deals]);

  const sorted = useMemo(() => {
    return [...openDeals].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "urgency":
          cmp = urgencyScore(b) - urgencyScore(a);
          break;
        case "empresa":
          cmp = a.clientName.localeCompare(b.clientName, "pt-BR");
          break;
        case "valor":
          cmp = b.value - a.value;
          break;
        case "nextAction": {
          const aDate = a.nextStepDate?.getTime() ?? Infinity;
          const bDate = b.nextStepDate?.getTime() ?? Infinity;
          cmp = aDate - bDate;
          break;
        }
        case "daysInStage":
          cmp = daysSince(b.recentAt) - daysSince(a.recentAt);
          break;
      }
      return sortDir === "asc" ? -cmp : cmp;
    });
  }, [openDeals, sortKey, sortDir]);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const allSelected = sorted.length > 0 && sorted.every((d) => selectedIds.has(d.id));

  function toggleAll(): void {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((d) => d.id)));
    }
  }

  function toggleRow(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalValue = sorted.reduce((s, d) => s + d.value, 0);
  const avgValue = sorted.length > 0 ? totalValue / sorted.length : 0;
  const overdueCount = sorted.filter((d) => isOverdue(d.nextStepDate)).length;
  const noProposalCount = sorted.filter((d) => !d.hasProposal).length;
  const medianDaysInStage = (() => {
    const days = sorted.map((d) => daysSince(d.recentAt)).sort((a, b) => a - b);
    if (days.length === 0) return 0;
    const mid = Math.floor(days.length / 2);
    return days.length % 2 === 0
      ? Math.round(((days[mid - 1] ?? 0) + (days[mid] ?? 0)) / 2)
      : (days[mid] ?? 0);
  })();

  const selectedCount = selectedIds.size;
  const sortLabel = sortKey === "urgency" ? "urgência" : sortKey;

  function sortArrow(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5 text-xs text-[var(--color-muted-foreground)]">
          <label className="flex cursor-pointer items-center gap-1.5 font-medium text-[var(--color-foreground)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-emerald-600"
            />
            Selecionar todas
          </label>
          <span>·</span>
          <span>
            Ordenado por <strong className="text-[var(--color-foreground)]">{sortLabel}</strong>
          </span>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-medium hover:border-[var(--color-foreground)]/30"
            >
              Colunas (10 de 14)
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-medium hover:border-[var(--color-foreground)]/30"
            >
              Densidade: média ▾
            </button>
          </div>
        </div>

        {}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-muted)]/50">
                <th className="w-9 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-emerald-600"
                  />
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]"
                  onClick={() => toggleSort("empresa")}
                >
                  Empresa{sortArrow("empresa")}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Estágio
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]"
                  onClick={() => toggleSort("valor")}
                >
                  Valor{sortArrow("valor")}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Contato
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Responsável
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]"
                  onClick={() => toggleSort("nextAction")}
                >
                  Próxima ação{sortArrow("nextAction")}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
                  onClick={() => toggleSort("daysInStage")}
                >
                  No estágio{sortArrow("daysInStage")}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Status
                </th>
                <th className="w-7 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal) => {
                const overdue = isOverdue(deal.nextStepDate);
                const stalledDays = daysSince(deal.recentAt);
                const isStale = !overdue && stalledDays >= STALLED_DAYS_THRESHOLD;
                const {
                  label: nextLabel,
                  overdue: nextOverdue,
                  soon: nextSoon,
                } = formatNextAction(deal.nextStepDate);
                const isSelected = selectedIds.has(deal.id);
                const avatarInitials = deal.assigneeName
                  ? deal.assigneeName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("")
                  : "";

                const rowStripe = isSelected
                  ? "border-l-[3px] border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10"
                  : overdue
                    ? "border-l-[3px] border-l-red-500"
                    : isStale
                      ? "border-l-[3px] border-l-amber-500"
                      : "";

                let statusLabel = "";
                let statusClass = "";
                if (overdue) {
                  statusLabel = "atrasado";
                  statusClass = "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
                } else if (!deal.hasProposal) {
                  statusLabel = "sem proposta";
                  statusClass =
                    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500";
                } else if (isStale) {
                  statusLabel = "parado";
                  statusClass =
                    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500";
                } else {
                  statusLabel = "ok";
                  statusClass =
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                }

                return (
                  <tr
                    key={deal.id}
                    onClick={() => onOpenDeal?.(deal)}
                    className={`group cursor-pointer border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-muted)]/30 ${rowStripe}`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(deal.id)}
                        className="accent-emerald-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <strong className="block text-[12px] font-semibold text-[var(--color-foreground)]">
                        {deal.clientName}
                      </strong>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        Energia Solar
                        {deal.dealId ? ` · #${deal.dealId.slice(-6).toUpperCase()}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stagePillClass(deal.stage)}`}
                      >
                        {STAGE_LABEL[deal.stage]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-[var(--color-foreground)]">
                      {formatCurrency(deal.value)}
                    </td>
                    <td className="px-3 py-3 text-[var(--color-muted-foreground)]">
                      <span className="block text-[12px] text-[var(--color-foreground)]">
                        {deal.clientName}
                      </span>
                      <span className="block text-[11px]">{deal.contact}</span>
                    </td>
                    <td className="px-3 py-3">
                      {avatarInitials ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted-foreground)]">
                          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 text-[9px] font-bold text-emerald-900">
                            {avatarInitials}
                          </span>
                          {deal.assigneeName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          nextOverdue
                            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : nextSoon
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}
                      >
                        {nextOverdue && "⚠ "}
                        {nextLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                      {stalledDays}d
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
                      >
                        <span className="text-[8px]">●</span>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100">
                        ···
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    Nenhuma negociação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-muted)]/30 text-[11px] text-[var(--color-muted-foreground)]">
                <td colSpan={3} className="px-3 py-2.5">
                  <strong className="text-[var(--color-foreground)]">
                    {sorted.length} negociações
                  </strong>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <strong className="text-[var(--color-foreground)]">
                    {formatCurrency(totalValue)}
                  </strong>
                </td>
                <td colSpan={4} className="px-3 py-2.5">
                  Ticket médio {formatCurrency(avgValue)} · Mediana dias-no-estágio:{" "}
                  {medianDaysInStage}
                </td>
                <td colSpan={2} className="px-3 py-2.5">
                  {overdueCount} atrasadas · {noProposalCount} sem proposta
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {}
      {selectedCount > 0 && (
        <div className="fixed bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[var(--color-foreground)] px-3.5 py-2.5 text-xs text-[var(--color-background)] shadow-2xl">
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
            {selectedCount}
          </span>
          <span>negociações selecionadas</span>
          <span className="h-3.5 w-px bg-white/20" />
          <button
            type="button"
            className="rounded bg-white/10 px-2.5 py-1 font-semibold hover:bg-white/20"
          >
            Avançar estágio
          </button>
          <button
            type="button"
            className="rounded bg-white/10 px-2.5 py-1 font-semibold hover:bg-white/20"
          >
            Atribuir
          </button>
          <button
            type="button"
            className="rounded bg-white/10 px-2.5 py-1 font-semibold hover:bg-white/20"
          >
            Exportar
          </button>
          <button
            type="button"
            className="rounded bg-emerald-600 px-2.5 py-1 font-semibold hover:bg-emerald-500"
          >
            Criar follow-up em lote
          </button>
          <span className="h-3.5 w-px bg-white/20" />
          <button
            type="button"
            className="text-white/60 hover:text-white"
            onClick={() => setSelectedIds(new Set())}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
