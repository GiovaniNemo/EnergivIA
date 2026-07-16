"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  PiggyBank,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPlatformRevenue,
  listPlatformCommissions,
  updatePlatformCommission,
  type CommissionStatus,
  type PlatformCommission,
  type PlatformRevenueSummary,
} from "@/lib/financing-api";

const STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada",
};

const STATUS_TONE: Record<CommissionStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  RECEIVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

const NEXT_STATUS: Record<CommissionStatus, CommissionStatus[]> = {
  PENDING: ["CONFIRMED", "RECEIVED", "CANCELLED"],
  CONFIRMED: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["CANCELLED"],
  CANCELLED: ["PENDING"],
};

function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function PlatformCommissionsView(): JSX.Element {
  const { currentOrganizationId, user, loading: orgLoading } = useOrganization();
  const [revenue, setRevenue] = useState<PlatformRevenueSummary | null>(null);
  const [items, setItems] = useState<PlatformCommission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "">("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const [rev, list] = await Promise.all([
        getPlatformRevenue(currentOrganizationId),
        listPlatformCommissions(currentOrganizationId, {
          status: statusFilter || undefined,
          providerId: providerFilter || undefined,
        }),
      ]);
      setRevenue(rev);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar comissões.");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, statusFilter, providerFilter]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const setStatus = useCallback(
    async (id: string, to: CommissionStatus) => {
      if (!currentOrganizationId) return;
      setActionId(id);
      try {
        await updatePlatformCommission(currentOrganizationId, id, {
          status: to,
          ...(to === "RECEIVED" ? { paidAt: new Date().toISOString() } : {}),
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao atualizar comissão.");
      } finally {
        setActionId(null);
      }
    },
    [currentOrganizationId, load]
  );

  const providerOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const c of items) set.set(c.provider.id, c.provider.name);
    return Array.from(set.entries());
  }, [items]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (user?.role !== "PLATFORM") {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        Apenas operadores Energivia (PLATFORM) podem acessar esta área.
      </p>
    );
  }
  if (loading) return <LoadingState label="Carregando comissões" compact />;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comissões Energivia</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Receita gerada pelos contratos originados na plataforma. Status fluem PENDENTE →
          CONFIRMADA → RECEBIDA conforme o banco paga.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {}
      {revenue ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Clock className="h-4 w-4" />}
              label="Pendente"
              value={formatBRL(revenue.pending)}
              tone="text-amber-600 dark:text-amber-400"
            />
            <Kpi
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Confirmada"
              value={formatBRL(revenue.confirmed)}
              tone="text-sky-600 dark:text-sky-400"
            />
            <Kpi
              icon={<PiggyBank className="h-4 w-4" />}
              label="Recebida"
              value={formatBRL(revenue.received)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Kpi
              icon={<Banknote className="h-4 w-4" />}
              label="Total projetado"
              value={formatBRL(revenue.total)}
            />
          </div>

          {revenue.cancelled > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <XCircle className="h-4 w-4" />
              {formatBRL(revenue.cancelled)} em comissões canceladas (contratos revertidos).
            </div>
          )}

          {revenue.byProvider.length > 0 && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <header className="mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold">Receita por financiador</h2>
              </header>
              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Financiador</th>
                      <th className="px-3 py-2 text-right font-medium">Contratos</th>
                      <th className="px-3 py-2 text-right font-medium">Pendente</th>
                      <th className="px-3 py-2 text-right font-medium">Confirmada</th>
                      <th className="px-3 py-2 text-right font-medium">Recebida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.byProvider.map((p) => (
                      <tr key={p.providerId} className="border-t border-[var(--color-border)]/60">
                        <td className="px-3 py-2.5 font-medium">{p.providerName}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{p.count}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatBRL(p.pending)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatBRL(p.confirmed)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatBRL(p.received)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : null}

      {}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">Comissões individuais</h2>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | "")}
              className="h-8 w-[150px]"
            >
              <option value="">Todos os status</option>
              {(Object.keys(STATUS_LABEL) as CommissionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="h-8 w-[180px]"
            >
              <option value="">Todos financiadores</option>
              {providerOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhuma comissão para os filtros selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Financiador</th>
                  <th className="px-3 py-2 text-right font-medium">Base (R$)</th>
                  <th className="px-3 py-2 text-right font-medium">Taxa</th>
                  <th className="px-3 py-2 text-right font-medium">Comissão</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Pago em</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const transitions = NEXT_STATUS[c.status];
                  return (
                    <tr key={c.id} className="border-t border-[var(--color-border)]/60">
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/financiamento/aplicacoes/${c.application.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.application.simulation.customerName}
                        </Link>
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">
                          Aprov.: {formatDate(c.application.approvedAt)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">{c.provider.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatBRL(c.baseAmountBrl)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.calculationType === "PERCENTAGE"
                          ? `${(Number(c.appliedValue) * 100).toFixed(2)}%`
                          : formatBRL(c.appliedValue)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatBRL(c.grossCommissionBrl)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[c.status]}`}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{formatDate(c.paidAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {transitions.map((to) => (
                            <Button
                              key={to}
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actionId === c.id}
                              onClick={() => void setStatus(c.id, to)}
                            >
                              {actionId === c.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                STATUS_LABEL[to]
                              )}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

interface KpiProps {
  icon: JSX.Element;
  label: string;
  value: string;
  tone?: string;
}

function Kpi({ icon, label, value, tone }: KpiProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
