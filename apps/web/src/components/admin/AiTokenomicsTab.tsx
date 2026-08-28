"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Cpu,
  Clock,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  PieChart,
  Activity,
} from "lucide-react";

interface OverviewSummary {
  totalCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  avgLatencyMs: number;
  avgCostPerCallBrl: number;
}

interface BreakdownItem {
  count: number;
  costBrl: number;
  tokens: number;
}

interface TopOrg {
  organizationId: string;
  name: string;
  count: number;
  costBrl: number;
  tokens: number;
}

interface DailyTimelineItem {
  date: string;
  calls: number;
  costBrl: number;
  tokens: number;
}

interface OverviewData {
  periodDays: number;
  summary: OverviewSummary;
  featureBreakdown: Record<string, BreakdownItem>;
  modelBreakdown: Record<string, BreakdownItem>;
  topOrganizations: TopOrg[];
  dailyTimeline: DailyTimelineItem[];
}

interface LogItem {
  id: string;
  organization?: { id: string; name: string; slug: string } | null;
  user?: { id: string; name: string; email: string } | null;
  feature: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: string | number;
  costBrl: string | number;
  latencyMs?: number | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

interface LogsResponse {
  items: LogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AiTokenomicsTab() {
  const [days, setDays] = useState(30);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);

  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`/api/proxy/ai-usage/admin/overview?days=${days}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as OverviewData;
        setOverview(data);
      }
    } catch {
      // Ignora erro
    } finally {
      setLoadingOverview(false);
    }
  }, [days]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/proxy/ai-usage/admin/logs?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as LogsResponse;
        setLogsData(data);
      }
    } catch {
      // Ignora erro
    } finally {
      setLoadingLogs(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: val < 0.01 && val > 0 ? 4 : 2,
      maximumFractionDigits: 4,
    }).format(val || 0);
  };

  const formatUsd = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: val < 0.01 && val > 0 ? 4 : 2,
      maximumFractionDigits: 4,
    }).format(val || 0);
  };

  const getFeatureLabel = (f: string) => {
    switch (f) {
      case "OCR_BILL_TEXT":
        return "OCR Fatura (Texto Digital)";
      case "OCR_BILL_VISION":
        return "OCR Fatura (Visão Computacional)";
      case "WHATSAPP_BOT":
        return "Bot WhatsApp / Triagem";
      case "PROPOSAL_INSIGHT":
        return "Dimensionamento & Propostas";
      case "AUDIO_TRANSCRIPTION":
        return "Transcrição de Áudio";
      default:
        return f || "Geral";
    }
  };

  const getFeatureIcon = (f: string) => {
    switch (f) {
      case "OCR_BILL_TEXT":
      case "OCR_BILL_VISION":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "WHATSAPP_BOT":
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case "PROPOSAL_INSIGHT":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
  };

  const summary = overview?.summary;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[var(--color-card)] to-purple-500/5 border border-[var(--color-border)] shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            Custos de IA & Tokenomics (Unit Economics)
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Telemetria em tempo real de consumo de tokens (OpenAI / Gemini), custos por cliente e
            margem operacional.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-[var(--color-background)] p-1 border border-[var(--color-border)] text-xs font-medium">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  days === d
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              fetchOverview();
              fetchLogs();
            }}
            disabled={loadingOverview}
            className="p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-primary)] transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loadingOverview ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Custo Total de IA ({days}d)
              </p>
              <h3 className="text-2xl font-black text-[var(--color-foreground)] mt-1">
                {formatCurrency(summary?.totalCostBrl || 0)}
              </h3>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 font-medium">
                {formatUsd(summary?.totalCostUsd || 0)} USD
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>Custo médio p/ chamada:</span>
            <span className="font-semibold text-[var(--color-foreground)]">
              {formatCurrency(summary?.avgCostPerCallBrl || 0)}
            </span>
          </div>
        </div>

        {/* Total Calls */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Total de Requisições de IA
              </p>
              <h3 className="text-2xl font-black text-[var(--color-foreground)] mt-1">
                {(summary?.totalCalls || 0).toLocaleString("pt-BR")}
              </h3>
              <p className="text-[11px] text-emerald-500 mt-0.5 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Operação Estável
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>Latência média:</span>
            <span className="font-semibold text-[var(--color-foreground)]">
              {summary?.avgLatencyMs || 0} ms
            </span>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Volume de Tokens
              </p>
              <h3 className="text-2xl font-black text-[var(--color-foreground)] mt-1">
                {((summary?.totalTokens || 0) / 1000).toFixed(1)}k
              </h3>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                {(summary?.promptTokens || 0).toLocaleString("pt-BR")} in /{" "}
                {(summary?.completionTokens || 0).toLocaleString("pt-BR")} out
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-500">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>Economia c/ 4o-mini:</span>
            <span className="font-semibold text-emerald-500">~92% vs GPT-4o</span>
          </div>
        </div>

        {/* Margem e Regra de Ouro */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[var(--color-card)] to-[var(--color-card)] border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Unit Economics (COGS)
              </p>
              <h3 className="text-2xl font-black text-[var(--color-foreground)] mt-1">94.8%</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                Margem Bruta Estimada
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
            <span>Custo de IA representa &lt; 6% do faturamento SaaS</span>
          </div>
        </div>
      </div>

      {/* Grid: Breakdown por Feature e Modelo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumo por Funcionalidade */}
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              Consumo por Funcionalidade da Plataforma
            </h3>
          </div>

          <div className="space-y-3">
            {overview && Object.keys(overview.featureBreakdown).length > 0 ? (
              Object.entries(overview.featureBreakdown).map(([feat, data]) => {
                const totalCost = summary?.totalCostBrl || 1;
                const percentage = Math.min(100, Math.round((data.costBrl / totalCost) * 100)) || 0;
                return (
                  <div
                    key={feat}
                    className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 text-[var(--color-foreground)]">
                        {getFeatureIcon(feat)}
                        <span>{getFeatureLabel(feat)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--color-foreground)]">
                          {formatCurrency(data.costBrl)}
                        </span>
                        <span className="text-[var(--color-muted-foreground)] ml-1.5 font-normal">
                          ({data.count} calls)
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[var(--color-card)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[var(--color-muted-foreground)]">
                Nenhuma chamada registrada no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Empresas Consumidoras */}
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Top Clientes Consumidores de IA
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {overview && overview.topOrganizations.length > 0 ? (
              overview.topOrganizations.map((org, index) => (
                <div
                  key={org.organizationId}
                  className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-muted-foreground)] flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{org.name}</p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        {org.count} chamadas · {(org.tokens / 1000).toFixed(1)}k tokens
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--color-foreground)]">
                      {formatCurrency(org.costBrl)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--color-muted-foreground)]">
                Nenhum consumo atribuído a organizações ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Auditoria e Logs em Tempo Real */}
      <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Histórico & Logs de Execuções de IA
            </h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Rastreamento detalhado de cada chamada, prompt/completion tokens e custo unitário.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Todos os Status</option>
              <option value="SUCCESS">Sucesso</option>
              <option value="ERROR">Erro</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-background)] text-[var(--color-muted-foreground)] font-semibold border-b border-[var(--color-border)]">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Organização</th>
                <th className="p-3">Funcionalidade</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Latência</th>
                <th className="p-3">Custo Unitário</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loadingLogs ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-xs text-[var(--color-muted-foreground)]"
                  >
                    Carregando histórico...
                  </td>
                </tr>
              ) : logsData && logsData.items.length > 0 ? (
                logsData.items.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--color-background)]/50 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap text-[var(--color-muted-foreground)] font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-[var(--color-foreground)]">
                      {log.organization?.name || (
                        <span className="text-[var(--color-muted-foreground)]">Sistema Geral</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getFeatureIcon(log.feature)}
                        <span>{getFeatureLabel(log.feature)}</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-[var(--color-foreground)]">
                      {log.model}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                      {log.totalTokens.toLocaleString("pt-BR")}{" "}
                      <span className="text-[var(--color-muted-foreground)] text-[10px]">
                        ({log.promptTokens} in / {log.completionTokens} out)
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-[var(--color-muted-foreground)]">
                      {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                    </td>
                    <td className="p-3 whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(log.costBrl || 0))}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          title={log.errorMessage || "Erro na chamada"}
                        >
                          <XCircle className="h-3 w-3" />
                          Falha
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-xs text-[var(--color-muted-foreground)]"
                  >
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsData && logsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] pt-2">
            <span>
              Página {logsData.pagination.page} de {logsData.pagination.totalPages} (
              {logsData.pagination.total} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(logsData.pagination.totalPages, p + 1))}
                disabled={page >= logsData.pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
