"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Layers,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
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
type TableDensity = "compacta" | "media" | "confortavel";

export type ColumnKey =
  | "empresa"
  | "estagio"
  | "valor"
  | "contato"
  | "responsavel"
  | "proximaAcao"
  | "noEstagio"
  | "status"
  | "proposta"
  | "temperatura"
  | "origem"
  | "cidade"
  | "dataAtualizacao"
  | "dataCriacao";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "empresa", label: "Empresa / Cliente", defaultVisible: true, required: true },
  { key: "estagio", label: "Estágio", defaultVisible: true },
  { key: "valor", label: "Valor", defaultVisible: true },
  { key: "contato", label: "Contato", defaultVisible: true },
  { key: "responsavel", label: "Responsável", defaultVisible: true },
  { key: "proximaAcao", label: "Próxima Ação", defaultVisible: true },
  { key: "noEstagio", label: "No Estágio", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "proposta", label: "Proposta", defaultVisible: true },
  { key: "temperatura", label: "Temperatura", defaultVisible: true },
  { key: "origem", label: "Origem / Canal", defaultVisible: false },
  { key: "cidade", label: "Cidade / Região", defaultVisible: false },
  { key: "dataAtualizacao", label: "Última Interação", defaultVisible: false },
  { key: "dataCriacao", label: "Data de Criação", defaultVisible: false },
];

export interface TableViewProps {
  deals: Deal[];
  assignees?: Array<{ userId: string; name: string; subtitle?: string }>;
  onOpenDeal?: (deal: Deal) => void;
  onAdvanceBatch?: (dealIds: string[], targetStage?: DealStage) => Promise<void>;
  onAssignBatch?: (dealIds: string[], assignedUserId: string | null) => Promise<void>;
  onFollowUpBatch?: (
    dealIds: string[],
    nextActionAt: string,
    nextActionType: string
  ) => Promise<void>;
}

export function PipelineTableView({
  deals,
  assignees = [],
  onOpenDeal,
  onAdvanceBatch,
  onAssignBatch,
  onFollowUpBatch,
}: TableViewProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Density state
  const [density, setDensity] = useState<TableDensity>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pipeline_table_density");
      if (saved === "compacta" || saved === "media" || saved === "confortavel") return saved;
    }
    return "media";
  });
  const [densityMenuOpen, setDensityMenuOpen] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pipeline_table_columns");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set<ColumnKey>(parsed);
          }
        } catch {}
      }
    }
    return new Set<ColumnKey>(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
  });
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  // Batch actions state
  const [advanceMenuOpen, setAdvanceMenuOpen] = useState(false);
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Follow-up form state
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [followUpNote, setFollowUpNote] = useState("Follow-up comercial");

  const densityRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<HTMLDivElement>(null);
  const assignRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (densityRef.current && !densityRef.current.contains(target)) {
        setDensityMenuOpen(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(target)) {
        setColumnsMenuOpen(false);
      }
      if (advanceRef.current && !advanceRef.current.contains(target)) {
        setAdvanceMenuOpen(false);
      }
      if (assignRef.current && !assignRef.current.contains(target)) {
        setAssignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  function toggleColumn(key: ColumnKey): void {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (key !== "empresa") next.delete(key);
      } else {
        next.add(key);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("pipeline_table_columns", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  }

  function handleSelectDensity(d: TableDensity): void {
    setDensity(d);
    setDensityMenuOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("pipeline_table_density", d);
    }
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

  // Density padding classes
  const cellPyClass =
    density === "compacta" ? "py-1.5" : density === "confortavel" ? "py-3.5" : "py-2.5";
  const cellTextClass = density === "compacta" ? "text-[11px]" : "text-xs";
  const headerPyClass =
    density === "compacta" ? "py-1.5" : density === "confortavel" ? "py-3" : "py-2.5";

  // Batch actions executors
  const handleExecuteAdvance = async (stage?: DealStage) => {
    if (!onAdvanceBatch || selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await onAdvanceBatch(Array.from(selectedIds), stage);
      setSelectedIds(new Set());
      setAdvanceMenuOpen(false);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExecuteAssign = async (userId: string | null) => {
    if (!onAssignBatch || selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await onAssignBatch(Array.from(selectedIds), userId);
      setSelectedIds(new Set());
      setAssignMenuOpen(false);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExecuteFollowUp = async () => {
    if (!onFollowUpBatch || selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await onFollowUpBatch(
        Array.from(selectedIds),
        new Date(followUpDate).toISOString(),
        followUpNote
      );
      setSelectedIds(new Set());
      setFollowUpModalOpen(false);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {/* Table Top Controls */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5 text-xs text-[var(--color-muted-foreground)]">
          <label className="flex cursor-pointer items-center gap-1.5 font-medium text-[var(--color-foreground)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-emerald-600 rounded"
            />
            Selecionar todas
          </label>
          <span>·</span>
          <span>
            Ordenado por <strong className="text-[var(--color-foreground)]">{sortLabel}</strong>
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Columns Customizer Dropdown */}
            <div ref={columnsRef} className="relative">
              <button
                type="button"
                onClick={() => setColumnsMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-foreground)]/30 hover:bg-[var(--color-muted)]/50"
              >
                <SlidersHorizontal className="h-3 w-3 opacity-70" />
                <span>
                  Colunas ({visibleColumns.size} de {ALL_COLUMNS.length})
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {columnsMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="border-b border-[var(--color-border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                    Exibir ou ocultar colunas
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                    {ALL_COLUMNS.map((col) => {
                      const isChecked = visibleColumns.has(col.key);
                      return (
                        <label
                          key={col.key}
                          className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                            col.required
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-[var(--color-muted)]"
                          }`}
                        >
                          <span className="font-medium text-[var(--color-foreground)]">
                            {col.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={col.required}
                            onChange={() => toggleColumn(col.key)}
                            className="accent-emerald-600 rounded"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = new Set(
                          ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
                        );
                        setVisibleColumns(defaults);
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            "pipeline_table_columns",
                            JSON.stringify(Array.from(defaults))
                          );
                        }
                      }}
                      className="w-full text-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 py-1 hover:underline"
                    >
                      Restaurar padrão
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Density Dropdown */}
            <div ref={densityRef} className="relative">
              <button
                type="button"
                onClick={() => setDensityMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-foreground)]/30 hover:bg-[var(--color-muted)]/50 capitalize"
              >
                <Layers className="h-3 w-3 opacity-70" />
                <span>Densidade: {density}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {densityMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleSelectDensity("compacta")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      density === "compacta"
                        ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                        : "hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                    }`}
                  >
                    <span>Compacta</span>
                    {density === "compacta" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDensity("media")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      density === "media"
                        ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                        : "hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                    }`}
                  >
                    <span>Média (Padrão)</span>
                    {density === "media" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDensity("confortavel")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      density === "confortavel"
                        ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                        : "hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                    }`}
                  >
                    <span>Confortável</span>
                    {density === "confortavel" && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${cellTextClass}`}>
            <thead>
              <tr className="bg-[var(--color-muted)]/50">
                <th className={`w-9 px-3 ${headerPyClass}`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-emerald-600 rounded"
                  />
                </th>

                {visibleColumns.has("empresa") && (
                  <th
                    className={`cursor-pointer whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]`}
                    onClick={() => toggleSort("empresa")}
                  >
                    Empresa{sortArrow("empresa")}
                  </th>
                )}

                {visibleColumns.has("estagio") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Estágio
                  </th>
                )}

                {visibleColumns.has("valor") && (
                  <th
                    className={`cursor-pointer whitespace-nowrap px-3 ${headerPyClass} text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]`}
                    onClick={() => toggleSort("valor")}
                  >
                    Valor{sortArrow("valor")}
                  </th>
                )}

                {visibleColumns.has("contato") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Contato
                  </th>
                )}

                {visibleColumns.has("responsavel") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Responsável
                  </th>
                )}

                {visibleColumns.has("proximaAcao") && (
                  <th
                    className={`cursor-pointer whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]`}
                    onClick={() => toggleSort("nextAction")}
                  >
                    Próxima ação{sortArrow("nextAction")}
                  </th>
                )}

                {visibleColumns.has("noEstagio") && (
                  <th
                    className={`cursor-pointer whitespace-nowrap px-3 ${headerPyClass} text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                    onClick={() => toggleSort("daysInStage")}
                  >
                    No estágio{sortArrow("daysInStage")}
                  </th>
                )}

                {visibleColumns.has("status") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Status
                  </th>
                )}

                {visibleColumns.has("proposta") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Proposta
                  </th>
                )}

                {visibleColumns.has("temperatura") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Temp.
                  </th>
                )}

                {visibleColumns.has("origem") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Origem
                  </th>
                )}

                {visibleColumns.has("cidade") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Cidade
                  </th>
                )}

                {visibleColumns.has("dataAtualizacao") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Atualização
                  </th>
                )}

                {visibleColumns.has("dataCriacao") && (
                  <th
                    className={`whitespace-nowrap px-3 ${headerPyClass} text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]`}
                  >
                    Criação
                  </th>
                )}

                <th className={`w-7 px-3 ${headerPyClass}`} />
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
                    <td className={`px-3 ${cellPyClass}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(deal.id)}
                        className="accent-emerald-600 rounded"
                      />
                    </td>

                    {visibleColumns.has("empresa") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        <strong className="block font-semibold text-[var(--color-foreground)]">
                          {deal.clientName}
                        </strong>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">
                          Energia Solar
                          {deal.dealId ? ` · #${deal.dealId.slice(-6).toUpperCase()}` : ""}
                        </span>
                      </td>
                    )}

                    {visibleColumns.has("estagio") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stagePillClass(deal.stage)}`}
                        >
                          {STAGE_LABEL[deal.stage]}
                        </span>
                      </td>
                    )}

                    {visibleColumns.has("valor") && (
                      <td
                        className={`px-3 ${cellPyClass} text-right font-bold tabular-nums text-[var(--color-foreground)]`}
                      >
                        {formatCurrency(deal.value)}
                      </td>
                    )}

                    {visibleColumns.has("contato") && (
                      <td className={`px-3 ${cellPyClass} text-[var(--color-muted-foreground)]`}>
                        <span className="block font-medium text-[var(--color-foreground)]">
                          {deal.clientName}
                        </span>
                        <span className="block text-[11px]">{deal.contact}</span>
                      </td>
                    )}

                    {visibleColumns.has("responsavel") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        {avatarInitials ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted-foreground)]">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 text-[9px] font-bold text-emerald-900">
                              {avatarInitials}
                            </span>
                            {deal.assigneeName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--color-muted-foreground)]">
                            —
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.has("proximaAcao") && (
                      <td className={`px-3 ${cellPyClass}`}>
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
                    )}

                    {visibleColumns.has("noEstagio") && (
                      <td
                        className={`px-3 ${cellPyClass} text-right tabular-nums text-[var(--color-muted-foreground)]`}
                      >
                        {daysSince(deal.recentAt)}d
                      </td>
                    )}

                    {visibleColumns.has("status") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${statusClass}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel}
                        </span>
                      </td>
                    )}

                    {visibleColumns.has("proposta") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        {deal.hasProposal ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Gerada
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--color-muted-foreground)]">
                            Pendente
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.has("temperatura") && (
                      <td className={`px-3 ${cellPyClass}`}>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">
                          {deal.proposalFollowUpStatus === "viewed" ? "🔥 Quente" : "—"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.has("origem") && (
                      <td
                        className={`px-3 ${cellPyClass} text-[11px] text-[var(--color-muted-foreground)]`}
                      >
                        {deal.originFromSimulation ? "Simulação" : "Direto"}
                      </td>
                    )}

                    {visibleColumns.has("cidade") && (
                      <td
                        className={`px-3 ${cellPyClass} text-[11px] text-[var(--color-muted-foreground)]`}
                      >
                        —
                      </td>
                    )}

                    {visibleColumns.has("dataAtualizacao") && (
                      <td
                        className={`px-3 ${cellPyClass} text-[11px] text-[var(--color-muted-foreground)]`}
                      >
                        {deal.recentAt.toLocaleDateString("pt-BR")}
                      </td>
                    )}

                    {visibleColumns.has("dataCriacao") && (
                      <td
                        className={`px-3 ${cellPyClass} text-[11px] text-[var(--color-muted-foreground)]`}
                      >
                        —
                      </td>
                    )}

                    <td className={`px-3 ${cellPyClass} text-right`}>
                      <span className="text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100">
                        ➔
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-muted)]/30 font-medium text-[var(--color-muted-foreground)]">
                <td className="px-3 py-2.5">
                  <strong className="text-[var(--color-foreground)]">{sorted.length}</strong>
                </td>
                <td className="px-3 py-2.5">
                  <strong className="text-[var(--color-foreground)]">
                    Total ({sorted.length} negociações)
                  </strong>
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <strong className="text-[var(--color-foreground)]">
                    {formatCurrency(totalValue)}
                  </strong>
                </td>
                <td colSpan={visibleColumns.size} className="px-3 py-2.5">
                  Ticket médio {formatCurrency(avgValue)} · Mediana dias-no-estágio:{" "}
                  {medianDaysInStage} · {overdueCount} atrasadas · {noProposalCount} sem proposta
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (Without Exportar) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-zinc-900/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md border border-zinc-700/80 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
            {selectedCount}
          </span>
          <span className="font-medium text-zinc-200">negociações selecionadas</span>
          <span className="h-4 w-px bg-zinc-700" />

          {/* Action: Avançar estágio */}
          <div ref={advanceRef} className="relative">
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => setAdvanceMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              <span>Avançar estágio</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {advanceMenuOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-52 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-200 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Mover em lote para:
                </div>
                <button
                  type="button"
                  onClick={() => handleExecuteAdvance()}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-zinc-800"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Próximo estágio do funil</span>
                </button>
                <div className="my-1 border-t border-zinc-800" />
                {(["novo", "contato", "proposta", "negociacao", "fechado"] as DealStage[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleExecuteAdvance(st)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <span>{STAGE_LABEL[st]}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${st === "fechado" ? "bg-slate-400" : st === "negociacao" ? "bg-emerald-400" : st === "proposta" ? "bg-violet-400" : st === "contato" ? "bg-blue-400" : "bg-zinc-400"}`}
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Action: Atribuir */}
          <div ref={assignRef} className="relative">
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => setAssignMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Atribuir</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {assignMenuOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-60 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-200 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Definir responsável:
                </div>
                <button
                  type="button"
                  onClick={() => handleExecuteAssign(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <span className="h-5 w-5 rounded-full border border-dashed border-zinc-500 flex items-center justify-center text-[10px]">
                    —
                  </span>
                  <span>Sem responsável (Desatribuir)</span>
                </button>
                <div className="my-1 border-t border-zinc-800" />
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {assignees.map((mem) => {
                    const initials = mem.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("");
                    return (
                      <button
                        key={mem.userId}
                        type="button"
                        onClick={() => handleExecuteAssign(mem.userId)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          {initials}
                        </span>
                        <span className="truncate">{mem.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action: Criar follow-up em lote */}
          <button
            type="button"
            disabled={batchLoading}
            onClick={() => setFollowUpModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {batchLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            <span>Criar follow-up em lote</span>
          </button>

          <span className="h-4 w-px bg-zinc-700" />
          <button
            type="button"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => setSelectedIds(new Set())}
            aria-label="Desmarcar todas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Batch Follow-up Dialog */}
      {followUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Agendar Próxima Ação em Lote</span>
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Agendando para{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {selectedCount} negociações
                  </strong>{" "}
                  selecionadas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Quick Date Chips */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                  Data e Horário
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: "Hoje 17h", addDays: 0, hour: 17 },
                    { label: "Amanhã 09h", addDays: 1, hour: 9 },
                    { label: "Em 3 dias", addDays: 3, hour: 10 },
                    { label: "Em 1 semana", addDays: 7, hour: 14 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + chip.addDays);
                        d.setHours(chip.hour, 0, 0, 0);
                        setFollowUpDate(d.toISOString().slice(0, 16));
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--color-foreground)] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Note Chips */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                  Tipo / Descrição da Ação
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "Enviar mensagem no WhatsApp",
                    "Apresentar proposta comercial",
                    "Cobrar retorno da proposta",
                    "Agendar visita técnica",
                    "Ligação de alinhamento",
                  ].map((msg) => (
                    <button
                      key={msg}
                      type="button"
                      onClick={() => setFollowUpNote(msg)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        followUpNote === msg
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Ex: Enviar proposta via WhatsApp e confirmar recebimento"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={batchLoading}
                onClick={handleExecuteFollowUp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {batchLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Salvar Follow-up para {selectedCount}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
