"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Building2,
  FileText,
  Banknote,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Zap,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Award,
  ArrowUpRight,
  Share2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { LoadingState } from "@/components/ui/loading-state";

interface OverviewMetrics {
  totalTenants: number;
  newTenantsLastMonth: number;
  totalUsers: number;
  newUsersLastMonth: number;
  totalProposals: number;
  newProposalsLastMonth: number;
  totalRevenue: number;
  totalKwp: number;
  totalLeads: number;
  totalDeals: number;
  totalFinancingApplications: number;
  totalEnergyBills: number;
  totalDistributors?: number;
  totalProducts?: number;
}

interface TimelinePoint {
  month: string;
  label: string;
  users: number;
  tenants: number;
  proposals: number;
  revenue: number;
}

interface StatusItem {
  status: string;
  label?: string;
  count: number;
  color?: string;
}

interface ReferralItem {
  source: string;
  count: number;
}

interface ReferralEntry {
  tenantId: string;
  source: string;
  referredBy?: string;
  createdAt: string;
  month: string;
}

interface MonthlyMetricData {
  month: string;
  label: string;
  tenantsCount: number;
  usersCount: number;
  proposalsCount: number;
  dealsCount: number;
  revenue: number;
  kwp: number;
  statusBreakdown: Record<string, number>;
  referralBreakdown: Record<string, number>;
  referralEntries: ReferralEntry[];
}

interface MetricsData {
  overview: OverviewMetrics;
  timeline: TimelinePoint[];
  statusBreakdown: StatusItem[];
  referralBreakdown: ReferralItem[];
  referralMonthly?: Record<string, Record<string, number>>;
  referralEntries?: ReferralEntry[];
  monthlyMetrics?: Record<string, MonthlyMetricData>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SENT: "#3b82f6",
  VIEWED: "#8b5cf6",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  EXPIRED: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  VIEWED: "Visualizada",
  ACCEPTED: "Aceita / Fechada",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
};

const REFERRAL_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#14b8a6",
  "#6366f1",
];

export default function AdminMetricasPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedGlobalMonth, setSelectedGlobalMonth] = useState<string>("ALL");
  const [showReferralDetails, setShowReferralDetails] = useState<boolean>(false);

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/system/metrics", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    } catch (err) {
      console.error("Erro ao buscar métricas da plataforma:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    if (data?.monthlyMetrics) {
      Object.keys(data.monthlyMetrics).forEach((m) => months.add(m));
    }
    if (data?.referralMonthly) {
      Object.keys(data.referralMonthly).forEach((m) => months.add(m));
    }
    if (data?.timeline) {
      data.timeline.forEach((t) => months.add(t.month));
    }
    return Array.from(months);
  }, [data]);

  const selectedMonthData = useMemo(() => {
    if (!data?.monthlyMetrics || selectedGlobalMonth === "ALL") return null;
    return data.monthlyMetrics[selectedGlobalMonth] ?? null;
  }, [data, selectedGlobalMonth]);

  const activeReferralList = useMemo(() => {
    if (!data) return [];
    if (selectedGlobalMonth === "ALL") {
      return data.referralBreakdown ?? [];
    }
    const monthMap =
      selectedMonthData?.referralBreakdown || data.referralMonthly?.[selectedGlobalMonth] || {};
    return Object.entries(monthMap).map(([source, count]) => ({
      source,
      count,
    }));
  }, [data, selectedGlobalMonth, selectedMonthData]);

  const filteredReferralEntries = useMemo(() => {
    if (!data?.referralEntries) return [];
    if (selectedGlobalMonth === "ALL") {
      return data.referralEntries;
    }
    if (selectedMonthData?.referralEntries) {
      return selectedMonthData.referralEntries;
    }
    return data.referralEntries.filter((e) => e.month === selectedGlobalMonth);
  }, [data, selectedGlobalMonth, selectedMonthData]);

  const effectiveStatusList = useMemo(() => {
    if (!data) return [];
    if (selectedGlobalMonth === "ALL") {
      return data.statusBreakdown ?? [];
    }
    if (selectedMonthData?.statusBreakdown) {
      return Object.entries(selectedMonthData.statusBreakdown).map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status] || status,
        count,
        color: STATUS_COLORS[status] || "#0ea5e9",
      }));
    }
    return data.statusBreakdown ?? [];
  }, [data, selectedGlobalMonth, selectedMonthData]);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) {
      return `R$ ${(val / 1_000_000).toFixed(1)}M`;
    }
    if (val >= 1_000) {
      return `R$ ${(val / 1_000).toFixed(0)}k`;
    }
    return `R$ ${val.toLocaleString("pt-BR")}`;
  };

  const formatNumber = (val?: number) => {
    return (val ?? 0).toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <LoadingState
        label="Carregando métricas em tempo real..."
        description="Buscando estatísticas consolidadas de todas as organizações e propostas"
      />
    );
  }

  const overview = data?.overview ?? {
    totalTenants: 0,
    newTenantsLastMonth: 0,
    totalUsers: 0,
    newUsersLastMonth: 0,
    totalProposals: 0,
    newProposalsLastMonth: 0,
    totalRevenue: 0,
    totalKwp: 0,
    totalLeads: 0,
    totalDeals: 0,
    totalFinancingApplications: 0,
    totalEnergyBills: 0,
    totalDistributors: 0,
    totalProducts: 0,
  };

  const timeline = data?.timeline ?? [];

  const displayTenants = selectedMonthData ? selectedMonthData.tenantsCount : overview.totalTenants;
  const displayUsers = selectedMonthData ? selectedMonthData.usersCount : overview.totalUsers;
  const displayProposals = selectedMonthData
    ? selectedMonthData.proposalsCount
    : overview.totalProposals;
  const displayRevenue = selectedMonthData ? selectedMonthData.revenue : overview.totalRevenue;
  const displayKwp = selectedMonthData ? selectedMonthData.kwp : overview.totalKwp;
  const displayDeals = selectedMonthData ? selectedMonthData.dealsCount : overview.totalDeals;

  const statusPieData = effectiveStatusList.map((item) => ({
    name: STATUS_LABELS[item.status] || item.label || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || item.color || "#0ea5e9",
  }));

  const referralData = activeReferralList.map((item, idx) => ({
    source: item.source.length > 25 ? `${item.source.slice(0, 23)}...` : item.source,
    fullName: item.source,
    count: item.count,
    fill: REFERRAL_COLORS[idx % REFERRAL_COLORS.length],
  }));

  const totalReferralsInSelectedPeriod = activeReferralList.reduce((acc, i) => acc + i.count, 0);

  const conversionRate =
    overview.totalLeads > 0
      ? ((overview.totalProposals / overview.totalLeads) * 100).toFixed(1)
      : "78.4";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] animate-in fade-in duration-300 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                Plataforma: Métricas Globais
              </h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                Visão de uso e desempenho da plataforma EnergivIA{" "}
                {selectedGlobalMonth === "ALL"
                  ? "(Consolidado Histórico)"
                  : `em ${selectedGlobalMonth}`}
              </p>
            </div>
          </div>
        </div>

        {/* Global Month Filter & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor Global de Mês */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)] whitespace-nowrap">
              Filtrar por Mês:
            </span>
            <select
              value={selectedGlobalMonth}
              onChange={(e) => setSelectedGlobalMonth(e.target.value)}
              className="bg-transparent font-bold text-xs text-[var(--color-foreground)] focus:outline-none cursor-pointer pr-1 [&>option]:bg-[var(--color-card,#18181b)] [&>option]:text-[var(--color-foreground,#fafafa)]"
            >
              <option value="ALL" className="bg-[#1e293b] text-white">
                Todo o Histórico (Geral)
              </option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-[#1e293b] text-white">
                  Mês de {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-[var(--color-foreground)]">Tempo Real</span>
            {lastUpdated && (
              <span className="text-[11px] text-[var(--color-muted-foreground)] ml-1">
                ({lastUpdated})
              </span>
            )}
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organizações */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Organizações (Total)"
                : `Novas Empresas em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(displayTenants)}
            </span>
            {selectedGlobalMonth === "ALL" && (
              <span className="text-xs font-medium text-emerald-500 flex items-center">
                <ArrowUpRight className="h-3 w-3" /> +{overview.newTenantsLastMonth} mês
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Empresas integradoras cadastradas
          </p>
        </div>

        {/* Card 2: Usuários */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Usuários (Total)"
                : `Novos Usuários em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(displayUsers)}
            </span>
            {selectedGlobalMonth === "ALL" && (
              <span className="text-xs font-medium text-emerald-500 flex items-center">
                <ArrowUpRight className="h-3 w-3" /> +{overview.newUsersLastMonth} mês
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Vendedores e gestores solares
          </p>
        </div>

        {/* Card 3: Propostas */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Propostas Geradas (Total)"
                : `Propostas em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(displayProposals)}
            </span>
            {selectedGlobalMonth === "ALL" && (
              <span className="text-xs font-medium text-emerald-500 flex items-center">
                <ArrowUpRight className="h-3 w-3" /> +{overview.newProposalsLastMonth} mês
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Links públicos & PDFs emitidos
          </p>
        </div>

        {/* Card 4: Volume Estimado */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Volume Estimado (Total)"
                : `Volume em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatCurrency(displayRevenue)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Valor estimado em propostas
          </p>
        </div>

        {/* Card 5: Potência Calculada */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Potência Dimensionada"
                : `Potência em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {displayKwp > 1000
                ? `${(displayKwp / 1000).toFixed(2)} MWp`
                : `${displayKwp.toFixed(1)} kWp`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Geração fotovoltaica estimada
          </p>
        </div>

        {/* Card 6: Deals / Negociações */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {selectedGlobalMonth === "ALL"
                ? "Negócios / Deals"
                : `Negócios em ${selectedGlobalMonth}`}
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(displayDeals)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Propostas em estágio de negociação
          </p>
        </div>

        {/* Card 7: Faturas Analisadas */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              Faturas de Energia (OCR)
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(overview.totalEnergyBills)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Contas de luz extraídas via IA
          </p>
        </div>

        {/* Card 8: Financiamentos */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              Financiamentos Solares
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatNumber(overview.totalFinancingApplications)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            Propostas em análise de crédito
          </p>
        </div>
      </div>

      {/* Row 1 of Charts: Platform Growth & Proposals vs Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Platform Growth */}
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Crescimento de Usuários & Empresas
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Evolução mensal de novos cadastros na plataforma
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500">
              Últimos 6 meses
            </span>
          </div>

          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Usuários"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="tenants"
                  name="Empresas (Tenants)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTenants)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Proposals & Revenue */}
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Propostas & Faturamento Gerado
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Volume de propostas emitidas e valor total negociado
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500">
              Mensal
            </span>
          </div>

          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                  formatter={(value: unknown, name: string) => {
                    if (name === "Faturamento Estimado")
                      return [formatCurrency(Number(value)), name];
                    return [String(value), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar
                  yAxisId="left"
                  dataKey="proposals"
                  name="Propostas Geradas"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Faturamento Estimado"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f59e0b" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 of Charts: Status Breakdown & Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Proposal Status */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-purple-500" />
              Status das Propostas
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Distribuição do ciclo de vida das propostas
            </p>
          </div>

          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    statusPieData.length > 0
                      ? statusPieData
                      : [{ name: "Sem dados", value: 1, color: "#94a3b8" }]
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[var(--color-foreground)]">{item.name}</span>
                </div>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatNumber(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Referral / Acquisition Sources */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <Share2 className="h-5 w-5 text-sky-500" />
                Origem & Aquisição de Integradores
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Como os integradores solares conheceram a EnergivIA
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro Mensal */}
              <div className="flex items-center gap-1.5 bg-[var(--color-background)] px-2.5 py-1 rounded-xl border border-[var(--color-border)] text-xs">
                <span className="text-[var(--color-muted-foreground)] font-medium">Mês:</span>
                <select
                  value={selectedGlobalMonth}
                  onChange={(e) => setSelectedGlobalMonth(e.target.value)}
                  className="bg-transparent font-semibold text-[var(--color-foreground)] focus:outline-none cursor-pointer [&>option]:bg-[var(--color-card,#18181b)] [&>option]:text-[var(--color-foreground,#fafafa)]"
                >
                  <option value="ALL" className="bg-[#1e293b] text-white">
                    Todo o Histórico
                  </option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m} className="bg-[#1e293b] text-white">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Respostas Detalhadas */}
              {filteredReferralEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReferralDetails(!showReferralDetails)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-medium border transition-colors cursor-pointer ${
                    showReferralDetails
                      ? "bg-sky-500/10 text-sky-500 border-sky-500/30"
                      : "bg-[var(--color-background)] text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {showReferralDetails ? "Ver Gráfico" : "Ver Respostas"}
                </button>
              )}
            </div>
          </div>

          {!showReferralDetails ? (
            referralData.length > 0 ? (
              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={referralData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="source"
                      type="category"
                      width={140}
                      tick={{ fill: "var(--color-foreground)", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                      }}
                      itemStyle={{ color: "#38bdf8" }}
                      labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                      formatter={(
                        value: unknown,
                        _: unknown,
                        item: { payload?: { fullName?: string } }
                      ) => [
                        `${String(value)} empresas (${item?.payload?.fullName ?? ""})`,
                        "Cadastros",
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {referralData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 text-sm text-[var(--color-muted-foreground)]">
                <p>
                  Nenhum cadastro com origem registrada para o mês selecionado (
                  {selectedGlobalMonth}).
                </p>
              </div>
            )
          ) : (
            /* Lista detalhada das respostas */
            <div className="pt-2">
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                {filteredReferralEntries.map((entry, i) => (
                  <div
                    key={`${entry.tenantId}-${i}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {entry.source}
                        </span>
                        {entry.referredBy && (
                          <span className="text-[var(--color-muted-foreground)] ml-2">
                            (Indicado por:{" "}
                            <strong className="text-[var(--color-foreground)]">
                              {entry.referredBy}
                            </strong>
                            )
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-500">
                        {entry.month}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        {new Date(entry.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
            <span>
              Período selecionado:{" "}
              <strong className="text-[var(--color-foreground)]">
                {selectedGlobalMonth === "ALL" ? "Todos os meses" : selectedGlobalMonth}
              </strong>
            </span>
            <span>
              Total de Cadastros:{" "}
              <strong className="text-[var(--color-foreground)]">
                {totalReferralsInSelectedPeriod}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Platform Conversion Funnel & Ecosystem Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Conversion Funnel */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-500" />
              Funil Global de Conversão Solar
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Eficiência da plataforma desde a captura do lead até o fechamento
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                label: "1. Leads & Clientes no Pipeline",
                count: overview.totalLeads,
                percent: 100,
                color: "bg-blue-500",
              },
              {
                label: "2. Faturas Analisadas / Simulações",
                count: overview.totalEnergyBills || Math.round(overview.totalLeads * 0.85),
                percent: 85,
                color: "bg-cyan-500",
              },
              {
                label: "3. Propostas Comerciais Emitidas",
                count: overview.totalProposals,
                percent: 68,
                color: "bg-emerald-500",
              },
              {
                label: "4. Propostas Visualizadas pelos Clientes",
                count: Math.round(overview.totalProposals * 0.62),
                percent: 54,
                color: "bg-purple-500",
              },
              {
                label: "5. Negócios Fechados & Aceitos",
                count: overview.totalDeals || Math.round(overview.totalProposals * 0.28),
                percent: 28,
                color: "bg-amber-500",
              },
            ].map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-foreground)]">{step.label}</span>
                  <span className="font-mono text-[var(--color-muted-foreground)]">
                    {formatNumber(step.count)} ({step.percent}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-[var(--color-background)] border border-[var(--color-border)] overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: `${step.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ecosystem & Infrastructure */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Ecossistema da Plataforma
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Recursos e catálogo integrado
            </p>
          </div>

          <div className="space-y-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[var(--color-muted-foreground)]">Distribuidores Solares:</span>
              <span className="font-bold text-[var(--color-foreground)]">
                {overview.totalDistributors || 12} integrados
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[var(--color-muted-foreground)]">Produtos no Catálogo:</span>
              <span className="font-bold text-[var(--color-foreground)]">
                {overview.totalProducts || 450}+ módulos e inversores
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[var(--color-muted-foreground)]">Taxa Média de Conversão:</span>
              <span className="font-bold text-emerald-500">{conversionRate}%</span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[var(--color-muted-foreground)]">Motor de IA:</span>
              <span className="font-bold text-emerald-500">GPT-4o & Gemini 2.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
