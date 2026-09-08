"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  Download,
  FileText,
  Filter,
  MessageSquare,
  Plus,
  Search,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  getLeadsDashboardStats,
  listLeads,
  listProposals,
  type DealStage,
  type LeadListItem,
  type ProposalListItem,
} from "@/lib/leads-api";
import { BillQuickStartDialog } from "@/components/dashboard/bill-quick-start-dialog";
import { NewProposalDialog } from "@/components/dashboard/new-proposal-dialog";

const ACCEPTED_BILL_TYPES =
  ".pdf,.jpg,.jpeg,.png,.heic,.webp,application/pdf,image/jpeg,image/png,image/webp,image/heic";
const MAX_BILL_BYTES = 10 * 1024 * 1024;

type StageKey = "novo" | "contato" | "proposta" | "negociacao" | "fechado";

const STAGE_DEFS: { key: StageKey; label: string; dealStage: DealStage; color: string }[] = [
  { key: "novo", label: "Novo", dealStage: "NEW", color: "#94a3b8" },
  { key: "contato", label: "Contato", dealStage: "CONTACTED", color: "#2563eb" },
  { key: "proposta", label: "Proposta", dealStage: "PROPOSAL", color: "#7c3aed" },
  { key: "negociacao", label: "Negociação", dealStage: "NEGOTIATION", color: "#059669" },
  { key: "fechado", label: "Fechado", dealStage: "WON", color: "#334155" },
];

const FEED_ICON_STYLES: Record<
  "success" | "info" | "neutral",
  { bg: string; fg: string; border: string }
> = {
  success: { bg: "rgba(16, 185, 129, 0.15)", fg: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  info: { bg: "rgba(59, 130, 246, 0.15)", fg: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  neutral: { bg: "rgba(168, 85, 247, 0.15)", fg: "#a855f7", border: "rgba(168, 85, 247, 0.3)" },
};

function formatTodayLine(): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
  return fmt.format(new Date());
}

function firstName(name: string | undefined | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^\d.,-]/g, "")
      .replace(/\.(?=\d{3}\b)/g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function formatBRL(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "R$ 0";
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (value >= 10_000) return `R$ ${Math.round(value / 1_000).toLocaleString("pt-BR")}k`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function ProposalsBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { dateLabel?: string; count?: number } }>;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-lg">
      <p className="font-mono text-[11px] uppercase tracking-[.04em] text-[var(--color-muted-foreground)]">
        {point.dateLabel}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-foreground)]">
        {point.count ?? 0} {point.count === 1 ? "proposta" : "propostas"}
      </p>
    </div>
  );
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (isSameDay(date, now)) {
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Hoje ${fmt.format(date)}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Ontem ${fmt.format(date)}`;
  }
  if (diffH < 24 * 7) {
    const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", hour: "2-digit" });
    return fmt.format(date);
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export default function DashboardPage(): JSX.Element {
  const { user, currentOrganizationId, currentOrganization } = useOrganization();
  const orgId = currentOrganizationId;
  const todayLine = useMemo(() => formatTodayLine(), []);
  const greetingName = firstName(user?.name);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BILL_BYTES) {
      setUploadError("Arquivo acima de 10 MB. Reduza ou converta para PDF.");
      return;
    }
    setUploadError(null);
    setPendingFile(file);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0] ?? null;
      handleFile(file);
    },
    [handleFile]
  );

  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats", orgId],
    queryFn: () => getLeadsDashboardStats(orgId as string),
    enabled: Boolean(orgId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const leadsQuery = useQuery({
    queryKey: ["dashboard", "leads", orgId],
    queryFn: () => listLeads(orgId as string, { page: 1, pageSize: 200 }),
    enabled: Boolean(orgId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const proposalsQuery = useQuery({
    queryKey: ["dashboard", "proposals", orgId],
    queryFn: () => listProposals(orgId as string),
    enabled: Boolean(orgId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const leads: LeadListItem[] = leadsQuery.data?.data ?? [];
  const proposals: ProposalListItem[] = proposalsQuery.data ?? [];

  const stats = statsQuery.data;

  const leadsThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    return leads.filter((l) => {
      const created = new Date(l.createdAt);
      return !Number.isNaN(created.getTime()) && created >= monthStart;
    }).length;
  }, [leads]);

  const SENT_STATUSES = useMemo(() => new Set(["SENT", "VIEWED", "ACCEPTED", "REJECTED"]), []);
  const sentProposals = useMemo(
    () => proposals.filter((p) => SENT_STATUSES.has(String(p.status).toUpperCase())),
    [proposals, SENT_STATUSES]
  );
  const allProposalsInChart = proposals;

  const proposalsToday = useMemo(() => {
    const today = new Date();
    return proposals.filter((p) => {
      const created = new Date(p.createdAt);
      return !Number.isNaN(created.getTime()) && isSameDay(created, today);
    }).length;
  }, [proposals]);

  const conversionPct = useMemo(() => {
    if (!stats || stats.totalLeads <= 0) return 0;
    return Math.round((stats.dealsWon / stats.totalLeads) * 100);
  }, [stats]);

  const forecastRevenue = useMemo(() => {
    return leads
      .filter((l) => l.latestDealStage === "PROPOSAL" || l.latestDealStage === "NEGOTIATION")
      .reduce((sum, l) => sum + asNumber(l.latestDealValue), 0);
  }, [leads]);

  const chartPoints = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { day: string; dateLabel: string; count: number; recent: boolean }[] = [];
    const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        day: String(d.getDate()).padStart(2, "0"),
        dateLabel: dateFmt.format(d),
        count: 0,
        recent: i < 7,
      });
    }
    allProposalsInChart.forEach((p) => {
      const c = new Date(p.createdAt);
      if (Number.isNaN(c.getTime())) return;
      c.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - c.getTime()) / 86_400_000);
      if (diff < 0 || diff > 13) return;
      const slot = days[13 - diff];
      if (slot) slot.count += 1;
    });
    const total = days.reduce((sum, d) => sum + d.count, 0);
    return { days, total };
  }, [allProposalsInChart]);

  type FeedEntry = {
    kind: keyof typeof FEED_ICON_STYLES;
    icon: typeof Check;
    text: React.ReactNode;
    time: string;
    sortKey: number;
    href: string;
    sourceTag?: string;
  };
  const feed = useMemo<FeedEntry[]>(() => {
    const items: FeedEntry[] = [];
    leads
      .filter((l) => l.latestDealStage === "WON")
      .slice(0, 3)
      .forEach((l) => {
        items.push({
          kind: "success",
          icon: Check,
          text: (
            <>
              <strong className="font-semibold">{l.name}</strong> aceitou proposta
              {l.latestDealValue ? ` · ${formatBRL(asNumber(l.latestDealValue))}` : ""}
            </>
          ),
          time: relativeTime(l.latestDealUpdatedAt ?? l.updatedAt),
          sortKey: new Date(l.latestDealUpdatedAt ?? l.updatedAt).getTime() || 0,
          href: "/leads",
          sourceTag: "Fechado",
        });
      });
    sentProposals.slice(0, 5).forEach((p) => {
      items.push({
        kind: "neutral",
        icon: FileText,
        text: (
          <>
            Proposta enviada ·{" "}
            <strong className="font-semibold">{p.deal?.lead?.name ?? "Cliente"}</strong>
          </>
        ),
        time: relativeTime(p.createdAt),
        sortKey: new Date(p.createdAt).getTime() || 0,
        href: "/propostas",
        sourceTag: "Proposta",
      });
    });
    leads.slice(0, 5).forEach((l) => {
      const isWhatsApp = l.source?.toLowerCase().includes("whats");
      items.push({
        kind: "info",
        icon: isWhatsApp ? MessageSquare : Search,
        text: (
          <>
            Novo lead · <strong className="font-semibold">{l.name}</strong>
          </>
        ),
        time: relativeTime(l.createdAt),
        sortKey: new Date(l.createdAt).getTime() || 0,
        href: "/leads",
        sourceTag: isWhatsApp ? "WhatsApp" : (l.source ?? "Site"),
      });
    });
    return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 4);
  }, [leads, sentProposals]);

  const pipeline = useMemo(() => {
    return STAGE_DEFS.map((def) => {
      const inStage = leads.filter((l) => l.latestDealStage === def.dealStage);
      return {
        ...def,
        count: inStage.length,
        deals: inStage.slice(0, 4).map((l) => ({
          id: l.id,
          name: l.name,
          meta: l.company ?? l.source ?? "—",
          value: l.latestDealValue ? formatBRL(asNumber(l.latestDealValue)) : "",
          badge: l.latestDealProposalSentAt
            ? `Enviada · ${relativeTime(l.latestDealProposalSentAt)}`
            : l.source
              ? `${l.source} · ${relativeTime(l.createdAt)}`
              : relativeTime(l.updatedAt),
        })),
      };
    });
  }, [leads]);

  const isLoading = statsQuery.isLoading || leadsQuery.isLoading || proposalsQuery.isLoading;

  const kpis: {
    label: string;
    value: string;
    delta: string;
    trend: "up" | "down" | "neutral";
    icon: typeof Users;
    theme: {
      bg: string;
      fg: string;
      border: string;
    };
  }[] = [
    {
      label: "Leads este mês",
      value: orgId ? String(leadsThisMonth) : "—",
      delta: stats ? `${stats.totalLeads} acumulados no funil` : "",
      trend: "neutral",
      icon: Users,
      theme: {
        bg: "rgba(59, 130, 246, 0.12)",
        fg: "#3b82f6",
        border: "rgba(59, 130, 246, 0.25)",
      },
    },
    {
      label: "Propostas enviadas",
      value: orgId ? String(sentProposals.length) : "—",
      delta: proposalsToday > 0 ? `${proposalsToday} enviadas hoje` : "Nenhuma hoje",
      trend: proposalsToday > 0 ? "up" : "neutral",
      icon: FileText,
      theme: {
        bg: "rgba(168, 85, 247, 0.12)",
        fg: "#a855f7",
        border: "rgba(168, 85, 247, 0.25)",
      },
    },
    {
      label: "Taxa de conversão",
      value: stats ? `${conversionPct}%` : "—",
      delta: stats ? `${stats.dealsWon} ganhas de ${stats.totalLeads} leads` : "",
      trend: conversionPct > 0 ? "up" : "neutral",
      icon: TrendingUp,
      theme: {
        bg: "rgba(16, 185, 129, 0.12)",
        fg: "#10b981",
        border: "rgba(16, 185, 129, 0.25)",
      },
    },
    {
      label: "Receita prevista",
      value: orgId ? formatBRL(forecastRevenue) : "—",
      delta: stats
        ? `${(stats.dealsInProposal ?? 0) + (stats.dealsInNegotiation ?? 0)} negócios em aberto`
        : "",
      trend: "neutral",
      icon: Wallet,
      theme: {
        bg: "rgba(20, 184, 166, 0.12)",
        fg: "#14b8a6",
        border: "rgba(20, 184, 166, 0.25)",
      },
    },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Top greeting / actions */}
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--color-foreground)]">
            Painel
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            {greetingName ? `Olá, ${greetingName}. ` : ""}
            Aqui está o resumo de hoje, <span className="capitalize">{todayLine}</span>.
            {currentOrganization?.name &&
            currentOrganization.name.toLowerCase() !== greetingName.toLowerCase() ? (
              <span className="ml-2 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/60 px-2.5 py-0.5 text-xs font-medium text-[var(--color-foreground)]">
                {currentOrganization.name}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            <Download className="h-4 w-4" aria-hidden />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => setNewProposalOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nova proposta
          </button>
        </div>
      </header>

      {/* Hero Dropzone */}
      <section className="upload-hero relative grid grid-cols-1 overflow-hidden rounded-2xl border shadow-sm md:grid-cols-[1fr_320px]">
        <div
          role="button"
          tabIndex={0}
          aria-label="Arraste ou clique para enviar a conta de luz"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`upload-drop relative z-10 flex cursor-pointer items-center gap-5 px-6 py-6 outline-none transition-all md:border-r md:border-dashed md:border-emerald-500/20 ${
            isDragging ? "upload-drop-active" : ""
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_BILL_TYPES}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              handleFile(file);
              event.target.value = "";
            }}
          />
          <span className="upload-icon relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm">
            <Upload className="h-7 w-7 text-emerald-600 dark:text-emerald-300" aria-hidden />
            <span
              aria-hidden
              className="upload-drop-ring upload-icon-ring absolute -inset-1.5 rounded-[20px] border-2 border-dashed border-emerald-500/40"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[var(--color-foreground)]">
              Arraste a conta de luz para gerar uma{" "}
              <span className="font-bold text-emerald-500 dark:text-emerald-400">
                simulação em segundos
              </span>
            </h3>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--color-muted-foreground)]">
              A IA lê a fatura, identifica a distribuidora e monta kit + proposta automaticamente.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["PDF", "JPG", "PNG", "HEIC"] as const).map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/80 px-2 py-0.5 font-mono text-[11px] text-[var(--color-muted-foreground)]"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-[var(--color-muted-foreground)]/50">·</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">até 10 MB</span>
              <span className="text-[var(--color-muted-foreground)]/50">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300 shadow-sm transition-colors hover:bg-emerald-500/20">
                <Upload className="h-3 w-3" />
                selecionar arquivo
              </span>
            </div>
            {uploadError ? (
              <p className="mt-2 text-xs font-medium text-red-500">{uploadError}</p>
            ) : null}
          </div>
        </div>
        <aside className="upload-aside relative z-10 flex flex-col justify-center gap-2.5 border-t border-emerald-500/20 px-6 py-5 md:border-l-0 md:border-t-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              Fluxo automatizado
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              ⚡ ~8s extração
            </span>
          </div>
          {[
            { num: "1", label: "Enviar fatura", active: true, desc: "PDF ou foto da conta" },
            { num: "2", label: "IA extrai dados", active: false, desc: "Histórico e tarifas" },
            { num: "3", label: "Proposta pronta", active: false, desc: "Kit ideal dimensionado" },
          ].map((step, i, arr) => (
            <div key={step.num}>
              <div
                className={`flex items-center gap-2.5 text-[13px] ${
                  step.active ? "font-semibold" : ""
                } text-[var(--color-foreground)]`}
              >
                <span
                  className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold transition-all ${
                    step.active
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/30"
                      : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {step.num}
                </span>
                <div className="flex flex-col">
                  <span className="leading-tight">{step.label}</span>
                  <span className="text-[10px] text-[var(--color-muted-foreground)] leading-tight">
                    {step.desc}
                  </span>
                </div>
              </div>
              {i < arr.length - 1 ? (
                <div className="my-0.5 ml-[11px] h-3 w-px bg-emerald-500/30" aria-hidden />
              ) : null}
            </div>
          ))}
        </aside>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--color-card-foreground)]">
                  {stat.label}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-110"
                  style={{
                    backgroundColor: stat.theme.bg,
                    color: stat.theme.fg,
                    borderColor: stat.theme.border,
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="font-mono text-[28px] font-bold tracking-[-0.02em] text-[var(--color-foreground)]">
                {isLoading && stat.value === "—" ? (
                  <span className="inline-block h-[28px] w-16 animate-pulse rounded bg-[var(--color-muted)]" />
                ) : (
                  stat.value
                )}
              </div>
              {stat.delta ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {stat.trend === "up" ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span>▲</span> {stat.delta}
                    </span>
                  ) : stat.trend === "down" ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-600 dark:text-rose-400">
                      <span>▼</span> {stat.delta}
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">{stat.delta}</span>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {/* Chart + Recent Activity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
                Propostas — últimos 14 dias
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {chartPoints.total}{" "}
                {chartPoints.total === 1 ? "proposta gerada" : "propostas geradas"} no período
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Últimos 7 dias
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-600/50 dark:bg-slate-700/60" />
                Anteriores
              </span>
            </div>
          </div>
          <div
            className="mt-4 h-[220px] overflow-hidden rounded-lg p-2"
            style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.05), transparent)" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartPoints.days}
                margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                  opacity={0.4}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  }}
                  interval={0}
                />
                <YAxis
                  width={28}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{
                    fill: "var(--color-muted-foreground)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                />
                <Tooltip
                  content={<ProposalsBarTooltip />}
                  cursor={{ fill: "rgba(16,185,129,0.08)" }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={36}>
                  {chartPoints.days.map((point, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={point.recent ? "#10b981" : "#475569"}
                      opacity={point.count > 0 ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
                  Atividade recente
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  Últimas interações do funil
                </p>
              </div>
              <Link
                href="/leads"
                className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Ver tudo →
              </Link>
            </div>
            <div className="mt-3 flex flex-col divide-y divide-[var(--color-border)]/60">
              {feed.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                  {isLoading ? "Carregando..." : "Sem atividade recente."}
                </p>
              ) : (
                feed.map((entry, idx) => {
                  const Icon = entry.icon;
                  const palette = FEED_ICON_STYLES[entry.kind];
                  return (
                    <Link
                      key={`feed-${idx}`}
                      href={entry.href}
                      className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--color-muted)]/50"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: palette.bg,
                          color: palette.fg,
                          borderColor: palette.border,
                        }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] leading-[1.4] text-[var(--color-foreground)] transition-colors group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                          {entry.text}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-[var(--color-muted-foreground)]">
                          <span>{entry.time}</span>
                          {entry.sourceTag ? (
                            <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.2 text-[10px]">
                              {entry.sourceTag}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </article>
      </section>

      {}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Funil — Negociações
            </h3>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {leads.length} {leads.length === 1 ? "lead" : "leads"} no funil ·{" "}
              <Link href="/leads" className="underline underline-offset-2 hover:text-[#388e3c]">
                ver todos
              </Link>
            </p>
          </div>
          <Link
            href="/leads"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtros
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pipeline.map((stage) => (
            <div
              key={stage.key}
              className="min-h-[280px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
            >
              <div className="mb-2.5 h-[3px] rounded-full" style={{ background: stage.color }} />
              <h4 className="mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                {stage.label}
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-px font-mono text-[11px] text-[var(--color-foreground)]">
                  {stage.count}
                </span>
              </h4>
              {stage.deals.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-[var(--color-muted-foreground)]">
                  {isLoading ? "Carregando..." : "Sem negócios."}
                </p>
              ) : (
                stage.deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/leads/${deal.id}`}
                    className={`mb-2 block cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#a5d6a7] ${
                      stage.key === "fechado" ? "opacity-85" : ""
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-[var(--color-foreground)]">
                      {deal.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
                      <span className="truncate">{deal.meta}</span>
                      {deal.value ? (
                        <span className="font-mono font-semibold text-[#388e3c]">{deal.value}</span>
                      ) : null}
                    </div>
                    {deal.badge ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-1.5 py-px text-[10px] text-[#0f5132]">
                        {deal.badge}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      <BillQuickStartDialog
        file={pendingFile}
        open={pendingFile !== null}
        onClose={() => setPendingFile(null)}
      />

      <NewProposalDialog open={newProposalOpen} onClose={() => setNewProposalOpen(false)} />

      <style jsx>{`
        .upload-hero {
          background-color: var(--color-card);
          background-image:
            radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.15), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(20, 184, 166, 0.12), transparent 60%),
            linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(20, 184, 166, 0.04) 100%);
          border-color: rgba(16, 185, 129, 0.25);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.05),
            0 10px 30px -15px rgba(16, 185, 129, 0.2);
        }
        :global(.dark) .upload-hero {
          background-image:
            radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.18), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(20, 184, 166, 0.14), transparent 60%),
            linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(20, 184, 166, 0.04) 100%);
          border-color: rgba(16, 185, 129, 0.28);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.4),
            0 12px 40px -16px rgba(16, 185, 129, 0.25);
        }
        .upload-drop:hover {
          background-color: rgba(16, 185, 129, 0.06);
        }
        :global(.dark) .upload-drop:hover {
          background-color: rgba(16, 185, 129, 0.08);
        }
        .upload-drop-active {
          background-color: rgba(16, 185, 129, 0.14) !important;
          box-shadow: inset 0 0 0 2px rgba(16, 185, 129, 0.85);
        }
        :global(.dark) .upload-drop-active {
          background-color: rgba(16, 185, 129, 0.16) !important;
          box-shadow:
            inset 0 0 0 2px rgba(16, 185, 129, 0.85),
            0 0 30px rgba(16, 185, 129, 0.2);
        }
        .upload-aside {
          background-color: rgba(16, 185, 129, 0.03);
        }
        :global(.dark) .upload-aside {
          background-color: rgba(16, 185, 129, 0.05);
        }
        .upload-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.1));
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.25);
        }
        :global(.dark) .upload-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.15));
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.35);
        }
        .upload-icon-ring {
          border-color: rgba(16, 185, 129, 0.4);
        }
        :global(.dark) .upload-icon-ring {
          border-color: rgba(16, 185, 129, 0.45);
        }
        .upload-drop-ring {
          animation: upload-spin 18s linear infinite;
        }
        @keyframes upload-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
