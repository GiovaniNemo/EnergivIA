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
  ArrowDown,
  Check,
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
import { AntigravityParticlesCanvas } from "@/components/dashboard/AntigravityParticlesCanvas";
import {
  AnimatedNumber,
  formatBRLCompact,
  formatInteger,
  formatPercent,
} from "@/components/dashboard/animated-number";

import {
  DashboardKanban,
  DASHBOARD_STAGE_DEFS,
  type DashboardDealItem,
} from "@/components/dashboard/DashboardKanban";

const ACCEPTED_BILL_TYPES =
  ".pdf,.jpg,.jpeg,.png,.heic,.webp,application/pdf,image/jpeg,image/png,image/webp,image/heic";
const MAX_BILL_BYTES = 10 * 1024 * 1024;

const FEED_ICON_STYLES: Record<"success" | "info" | "neutral", { bg: string; fg: string }> = {
  success: { bg: "#e8f5e9", fg: "#388e3c" },
  info: { bg: "#dbeafe", fg: "#1e40af" },
  neutral: { bg: "#ede9fe", fg: "#6d28d9" },
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

  const effectiveRole = (currentOrganization?.role || user?.role || "").toUpperCase();
  const isOwnerOrAdmin =
    effectiveRole === "OWNER" || effectiveRole === "ADMIN" || effectiveRole === "PLATFORM";

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadHeroRef = useRef<HTMLElement | null>(null);

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

  const isChartDataReady = !proposalsQuery.isLoading && proposalsQuery.data !== undefined;
  const chartAnimationKey = useMemo(() => {
    return isChartDataReady
      ? `chart-ready-${orgId ?? "org"}-${chartPoints.total}`
      : "chart-loading";
  }, [isChartDataReady, orgId, chartPoints.total]);

  type FeedEntry = {
    kind: keyof typeof FEED_ICON_STYLES;
    icon: typeof Check;
    text: React.ReactNode;
    time: string;
    sortKey: number;
  };
  const feed = useMemo<FeedEntry[]>(() => {
    const items: FeedEntry[] = [];
    leads
      .filter((l) => l.latestDealStage === "WON")
      .slice(0, 4)
      .forEach((l) => {
        items.push({
          kind: "success",
          icon: Check,
          text: (
            <>
              <strong className="font-semibold">{l.name}</strong> fechou negócio
              {l.latestDealValue ? ` · ${formatBRL(asNumber(l.latestDealValue))}` : ""}
              {isOwnerOrAdmin && l.latestDealAssignedUserName ? (
                <span className="ml-1 text-[11px] text-[var(--color-muted-foreground)]">
                  (resp: {l.latestDealAssignedUserName})
                </span>
              ) : null}
            </>
          ),
          time: relativeTime(l.latestDealUpdatedAt ?? l.updatedAt),
          sortKey: new Date(l.latestDealUpdatedAt ?? l.updatedAt).getTime() || 0,
        });
      });
    sentProposals.slice(0, 6).forEach((p) => {
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
      });
    });
    leads.slice(0, 6).forEach((l) => {
      items.push({
        kind: "info",
        icon: l.source?.toLowerCase().includes("whats") ? MessageSquare : Search,
        text: (
          <>
            Novo cliente {l.source ? `via ${l.source}` : ""} ·{" "}
            <strong className="font-semibold">{l.name}</strong>
          </>
        ),
        time: relativeTime(l.createdAt),
        sortKey: new Date(l.createdAt).getTime() || 0,
      });
    });
    return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 5);
  }, [leads, sentProposals, isOwnerOrAdmin]);

  const dashboardDeals = useMemo<DashboardDealItem[]>(() => {
    return leads.map((l) => {
      const dealStage: DealStage = l.latestDealStage ?? "NEW";
      const stageDef =
        DASHBOARD_STAGE_DEFS.find((d) => d.dealStage === dealStage) ?? DASHBOARD_STAGE_DEFS[0];

      return {
        id: l.id,
        dealId: l.latestDealId ?? null,
        name: l.name,
        meta: l.company ?? l.source ?? "—",
        value: l.latestDealValue ? formatBRL(asNumber(l.latestDealValue)) : "",
        badge: l.latestDealProposalSentAt
          ? `Enviada · ${relativeTime(l.latestDealProposalSentAt)}`
          : l.source
            ? `${l.source} · ${relativeTime(l.createdAt)}`
            : relativeTime(l.updatedAt),
        stageKey: stageDef.key,
        dealStage,
      };
    });
  }, [leads]);

  const isLoading = statsQuery.isLoading || leadsQuery.isLoading || proposalsQuery.isLoading;

  const kpis: {
    label: string;
    value: string;
    numericValue?: number;
    formatter?: (val: number) => string;
    delta: string;
    trend: "up" | "down" | "neutral";
    icon: typeof Users;
  }[] = [
    {
      label: isOwnerOrAdmin ? "Leads da empresa" : "Seus leads este mês",
      value: orgId ? String(leadsThisMonth) : "—",
      numericValue: orgId ? leadsThisMonth : undefined,
      formatter: formatInteger,
      delta: stats ? `${stats.totalLeads} no total` : "",
      trend: leadsThisMonth > 0 ? "up" : "neutral",
      icon: Users,
    },
    {
      label: isOwnerOrAdmin ? "Propostas da equipe" : "Suas propostas enviadas",
      value: orgId ? String(sentProposals.length) : "—",
      numericValue: orgId ? sentProposals.length : undefined,
      formatter: formatInteger,
      delta: proposalsToday > 0 ? `${proposalsToday} enviadas hoje` : "—",
      trend: proposalsToday > 0 ? "up" : "neutral",
      icon: FileText,
    },
    {
      label: isOwnerOrAdmin ? "Taxa de conversão (empresa)" : "Sua taxa de conversão",
      value: stats ? `${conversionPct}%` : "—",
      numericValue: stats ? conversionPct : undefined,
      formatter: formatPercent,
      delta: stats ? `${stats.dealsWon} fechadas / ${stats.totalLeads} leads` : "",
      trend: conversionPct > 0 ? "up" : "neutral",
      icon: TrendingUp,
    },
    {
      label: isOwnerOrAdmin ? "Receita prevista (empresa)" : "Sua receita prevista",
      value: orgId ? formatBRL(forecastRevenue) : "—",
      numericValue: orgId ? forecastRevenue : undefined,
      formatter: formatBRLCompact,
      delta: stats
        ? `${(stats.dealsInProposal ?? 0) + (stats.dealsInNegotiation ?? 0)} negócios em aberto`
        : "",
      trend: "neutral",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6">
      {}
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--color-foreground)]">
              Painel
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                isOwnerOrAdmin
                  ? "border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isOwnerOrAdmin ? "Visão da Empresa" : "Seu Painel Comercial"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)] max-w-3xl leading-relaxed break-words">
            {greetingName ? `Olá, ${greetingName}. ` : ""}
            {isOwnerOrAdmin
              ? `Aqui está o resumo consolidado da empresa hoje, ${todayLine}.`
              : `Aqui está o resumo das suas oportunidades e propostas hoje, ${todayLine}.`}
            {currentOrganization?.name ? (
              <span className="font-medium text-[var(--color-foreground)]/80">
                {` · ${currentOrganization.name}`}
              </span>
            ) : (
              ""
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setNewProposalOpen(true)}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-500/15 border border-emerald-400/20 transition-all hover:brightness-105 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nova proposta
          </button>
        </div>
      </header>

      {}
      <section
        ref={uploadHeroRef}
        className="upload-hero relative grid grid-cols-1 overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05)] md:grid-cols-[1fr_320px]"
      >
        <AntigravityParticlesCanvas
          interactiveContainerRef={uploadHeroRef}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
        />
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
          className={`upload-drop relative z-10 flex cursor-pointer items-center gap-5 px-6 py-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] md:border-r md:border-dashed md:border-[rgba(52,211,153,0.18)] ${
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
          <span className="upload-icon relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl">
            <Upload className="h-7 w-7" aria-hidden />
            <span
              aria-hidden
              className="upload-drop-ring upload-icon-ring absolute -inset-1.5 rounded-[20px] border-2 border-dashed"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[var(--color-foreground)]">
              Arraste a conta de luz para gerar uma{" "}
              <span style={{ color: "#388e3c" }}>simulação em segundos</span>
            </h3>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--color-muted-foreground)]">
              A IA lê a fatura, identifica a concessionária e monta kit + proposta automaticamente.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {(["PDF", "JPG", "PNG", "HEIC"] as const).map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-muted-foreground)]"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-slate-300">·</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">até 10 MB</span>
              <span className="text-slate-300">·</span>
              <span
                className="text-[13px] font-semibold underline underline-offset-2"
                style={{ color: "#388e3c" }}
              >
                selecionar arquivo
              </span>
            </div>
            {uploadError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
            ) : null}
          </div>
        </div>
        <aside className="upload-aside relative z-10 flex flex-col justify-center gap-2.5 border-t border-[rgba(52,211,153,0.18)] px-6 py-5 md:border-l-0 md:border-t-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
            Fluxo automatizado
          </div>
          {[
            { num: "1", label: "Enviar fatura", active: true },
            { num: "2", label: "IA extrai consumo", active: false },
            { num: "3", label: "Proposta pronta", active: false },
          ].map((step, i, arr) => (
            <div key={step.num}>
              <div
                className={`flex items-center gap-2.5 text-[13px] ${
                  step.active ? "font-semibold" : ""
                } text-[var(--color-foreground)]`}
              >
                <span
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
                  style={
                    step.active
                      ? {
                          background: "var(--color-primary)",
                          color: "var(--color-primary-foreground)",
                          border: "1px solid var(--color-primary)",
                        }
                      : {
                          background: "var(--color-card)",
                          color: "var(--color-muted-foreground)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  {step.num}
                </span>
                {step.label}
              </div>
              {i < arr.length - 1 ? (
                <div className="ml-[10px] mt-1 text-slate-300" aria-hidden>
                  <ArrowDown className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </div>
          ))}
        </aside>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="group rounded-2xl glass-card glass-card-hover p-5 transition-all"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--color-card-foreground)]">
                  {stat.label}
                </span>
                <Icon
                  className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-emerald-500 transition-colors"
                  aria-hidden
                />
              </div>
              <div className="font-mono text-[26px] font-bold tracking-[-0.01em] text-[var(--color-foreground)]">
                {isLoading && stat.value === "—" ? (
                  <span className="inline-block h-[26px] w-16 animate-pulse rounded bg-[var(--color-muted)]" />
                ) : stat.numericValue !== undefined && orgId ? (
                  <AnimatedNumber
                    value={stat.numericValue}
                    formatter={stat.formatter}
                    duration={1200}
                  />
                ) : (
                  stat.value
                )}
              </div>
              {stat.delta ? (
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${
                    stat.trend === "up"
                      ? "text-[#16a34a] dark:text-[#34d399]"
                      : stat.trend === "down"
                        ? "text-[#dc2626] dark:text-[#f87171]"
                        : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {stat.trend !== "neutral" ? (
                    <span aria-hidden>{stat.trend === "up" ? "▲" : "▼"}</span>
                  ) : null}
                  {stat.delta}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {/* CHARTS & ACTIVITY */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl glass-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            {isOwnerOrAdmin
              ? "Propostas da equipe — últimos 14 dias"
              : "Suas propostas — últimos 14 dias"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Volume diário ·{" "}
            {proposalsQuery.isLoading ? (
              <span className="inline-block h-3 w-5 animate-pulse rounded bg-[var(--color-muted)]" />
            ) : (
              <AnimatedNumber
                value={chartPoints.total}
                duration={1200}
                className="font-semibold text-[var(--color-foreground)]"
              />
            )}{" "}
            no período
          </p>
          <div
            className="mt-4 h-[220px] overflow-hidden rounded-xl border border-[var(--color-border)]/50 bg-black/[0.02] dark:bg-black/20 backdrop-blur-xs"
            style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.06), transparent)" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                key={chartAnimationKey}
                data={chartPoints.days}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
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
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip
                  content={<ProposalsBarTooltip />}
                  cursor={{ fill: "rgba(34,197,94,0.08)" }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {chartPoints.days.map((point, idx) => (
                    <Cell key={`cell-${idx}`} fill={point.recent ? "#16a34a" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl glass-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            {isOwnerOrAdmin ? "Atividade recente da equipe" : "Suas atividades recentes"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {isOwnerOrAdmin
              ? "Últimas interações de todo o time em tempo real"
              : "Últimas interações dos seus clientes em tempo real"}
          </p>
          <div className="mt-3 flex flex-col">
            {feed.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                {isLoading ? "Carregando..." : "Sem atividade recente."}
              </p>
            ) : (
              feed.map((entry, idx) => {
                const Icon = entry.icon;
                const palette = FEED_ICON_STYLES[entry.kind];
                const isLast = idx === feed.length - 1;
                return (
                  <div
                    key={`feed-${idx}`}
                    className={`flex items-start gap-3 py-2.5 ${
                      isLast ? "" : "border-b border-[var(--color-muted)]"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs"
                      style={{ background: palette.bg, color: palette.fg }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] leading-[1.45] text-[var(--color-foreground)]">
                        {entry.text}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[var(--color-muted-foreground)]">
                        {entry.time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>

      {/* PIPELINE / FUNIL */}
      <section className="rounded-2xl glass-card p-6">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              {isOwnerOrAdmin ? "Funil — Todas as Negociações" : "Seu Funil — Suas Negociações"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {leads.length} {leads.length === 1 ? "lead" : "leads"} no funil ·{" "}
              <Link
                href="/leads"
                className="underline underline-offset-2 hover:text-emerald-500 transition-colors"
              >
                ver todos
              </Link>
            </p>
          </div>
          <Link
            href="/leads"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/[0.03] dark:bg-white/[0.04] px-3.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtros
          </Link>
        </div>
        <DashboardKanban
          initialItems={dashboardDeals}
          organizationId={orgId}
          isLoading={isLoading}
        />
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
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          background-image:
            radial-gradient(circle at 0% 0%, rgba(52, 211, 153, 0.15), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(20, 184, 166, 0.12), transparent 60%),
            linear-gradient(135deg, rgba(52, 211, 153, 0.05) 0%, rgba(20, 184, 166, 0.03) 100%);
          border: 1px solid rgba(52, 211, 153, 0.25);
          box-shadow:
            0 12px 32px -8px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        :global(.dark) .upload-hero {
          background-color: rgba(13, 20, 29, 0.72);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          background-image:
            radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.16), transparent 60%),
            radial-gradient(circle at 100% 100%, rgba(13, 148, 136, 0.1), transparent 65%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
          border: 1px solid rgba(16, 185, 129, 0.28);
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow:
            0 16px 40px -12px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }
        .upload-drop:hover {
          background-color: rgba(52, 211, 153, 0.06);
        }
        :global(.dark) .upload-drop:hover {
          background-color: rgba(16, 185, 129, 0.06);
        }
        .upload-drop-active {
          background-color: rgba(52, 211, 153, 0.14) !important;
          box-shadow: inset 0 0 0 2px rgba(52, 211, 153, 0.85);
        }
        :global(.dark) .upload-drop-active {
          background-color: rgba(16, 185, 129, 0.16) !important;
          box-shadow:
            inset 0 0 0 2px rgba(16, 185, 129, 0.85),
            0 0 30px rgba(16, 185, 129, 0.18);
        }
        .upload-aside {
          background-color: rgba(52, 211, 153, 0.03);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        :global(.dark) .upload-aside {
          background-color: rgba(16, 185, 129, 0.04);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .upload-icon {
          background: linear-gradient(135deg, #e8f5e9, #c8f0d6);
          color: #2e7d32;
        }
        :global(.dark) .upload-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(13, 148, 136, 0.16));
          color: #6ee7b7;
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.32);
        }
        .upload-icon-ring {
          border-color: rgba(76, 175, 80, 0.45);
        }
        :global(.dark) .upload-icon-ring {
          border-color: rgba(16, 185, 129, 0.42);
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
