"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  BarChart3,
  Clock,
  HandCoins,
  PercentSquare,
  Plus,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { getFinancingDashboardSummary, type FinancingDashboardSummary } from "@/lib/financing-api";

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Nova solicitação",
  AWAITING_DOCUMENTS: "Aguardando documentos",
  DOCUMENTS_RECEIVED: "Documentos recebidos",
  SUBMITTED_TO_BANK: "Enviado ao banco",
  UNDER_REVIEW: "Em análise",
  PENDING: "Pendência",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
  CONTRACT_SIGNED: "Contrato assinado",
  CREDIT_RELEASED: "Crédito liberado",
  COMPLETED: "Concluído",
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function formatPct(v: number, frac = 1): string {
  return `${(v * 100).toFixed(frac)}%`;
}

export function FinancingDashboardView(): JSX.Element {
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [data, setData] = useState<FinancingDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const sum = await getFinancingDashboardSummary(currentOrganizationId);
      setData(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (loading) return <LoadingState label="Carregando indicadores" compact />;
  if (error) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (!data) return <LoadingState label="Carregando indicadores" compact />;

  const isEmpty = data.totalApplications === 0 && data.totalSimulations === 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de financiamentos</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Volume, conversão e tempo médio de aprovação por instituição e por vendedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/financiamento/aplicacoes"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-accent)]"
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Ver Kanban
          </Link>
          <Link
            href="/financiamento/nova"
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova simulação
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhuma simulação ainda. Crie a primeira para começar a ver os indicadores.
          </p>
        </div>
      ) : (
        <>
          {}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Sparkles className="h-4 w-4" />}
              label="Simulações"
              value={String(data.totalSimulations)}
              hint="Total criadas"
            />
            <Kpi
              icon={<HandCoins className="h-4 w-4" />}
              label="Solicitações"
              value={String(data.totalApplications)}
              hint={`${data.totalApproved} aprovadas`}
            />
            <Kpi
              icon={<PercentSquare className="h-4 w-4" />}
              label="Taxa de aprovação"
              value={formatPct(data.approvalRate, 1)}
              hint={`${data.totalReleased} com crédito liberado`}
              accent={
                data.approvalRate > 0.5 ? "text-emerald-600 dark:text-emerald-400" : undefined
              }
            />
            <Kpi
              icon={<Banknote className="h-4 w-4" />}
              label="Total financiado"
              value={formatBRL(data.totalFinancedBrl)}
              hint={
                data.avgApprovalDays != null
                  ? `Aprovação média em ${data.avgApprovalDays} dias`
                  : "Sem aprovações ainda"
              }
            />
          </div>

          {}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <header className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold">Volume por financiador</h2>
            </header>
            {data.byProvider.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Sem dados ainda.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Financiador</th>
                      <th className="px-3 py-2 text-right font-medium">Simulações</th>
                      <th className="px-3 py-2 text-right font-medium">Solicitações</th>
                      <th className="px-3 py-2 text-right font-medium">Aprovados</th>
                      <th className="px-3 py-2 text-right font-medium">Liberados</th>
                      <th className="px-3 py-2 text-right font-medium">Volume</th>
                      <th className="px-3 py-2 text-right font-medium">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider.map((p) => {
                      const conv = p.applications > 0 ? p.approved / p.applications : 0;
                      return (
                        <tr key={p.providerId} className="border-t border-[var(--color-border)]/60">
                          <td className="px-3 py-2.5 font-medium">{p.providerName}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{p.simulations}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{p.applications}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{p.approved}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{p.released}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {formatBRL(p.totalFinancedBrl)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {p.applications > 0 ? formatPct(conv, 0) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <header className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm font-semibold">Distribuição por status</h2>
            </header>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-1 text-xs"
                >
                  <span className="font-medium">{STATUS_LABEL[status] ?? status}</span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </section>

          {}
          {data.bySeller.length > 0 && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <header className="mb-3 flex items-center gap-2">
                <Users2 className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold">Volume por vendedor</h2>
              </header>
              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Vendedor</th>
                      <th className="px-3 py-2 text-right font-medium">Solicitações</th>
                      <th className="px-3 py-2 text-right font-medium">Aprovados</th>
                      <th className="px-3 py-2 text-right font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySeller.map((s) => (
                      <tr key={s.userId} className="border-t border-[var(--color-border)]/60">
                        <td className="px-3 py-2.5">
                          <div className="font-medium">
                            {s.userName ?? s.userEmail ?? "Usuário desconhecido"}
                          </div>
                          {s.userName && s.userEmail && (
                            <div className="text-xs text-[var(--color-muted-foreground)]">
                              {s.userEmail}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{s.applications}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{s.approved}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {formatBRL(s.totalFinancedBrl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

interface KpiProps {
  icon: JSX.Element;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

function Kpi({ icon, label, value, hint, accent }: KpiProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
