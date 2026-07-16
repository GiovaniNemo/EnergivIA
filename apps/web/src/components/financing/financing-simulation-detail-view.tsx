"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import {
  createFinancingApplication,
  getFinancingSimulation,
  type FinancingOffer,
  type FinancingSimulationDetail,
} from "@/lib/financing-api";

function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatPct(value: number | string, fractionDigits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

function monthlyToAnnual(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1;
}

type SortKey = "installment" | "cet" | "total";

const SORT_LABEL: Record<SortKey, string> = {
  installment: "Menor parcela",
  cet: "Menor CET",
  total: "Menor valor total",
};

const ELIGIBILITY_LABEL: Record<string, string> = {
  ESTIMATED: "Estimativa",
  PRE_APPROVED: "Pré-aprovado",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
};

const ELIGIBILITY_TONE: Record<string, string> = {
  ESTIMATED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PRE_APPROVED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

const MODE_LABEL: Record<string, string> = {
  API: "Integração API",
  ASSISTED: "Parceiro humano",
  MANUAL: "Manual",
};

interface BestOf {
  installmentId: string | null;
  cetId: string | null;
  totalId: string | null;
  termId: string | null;
  scoreId: string | null;
}

function computeBest(offers: FinancingOffer[]): BestOf {
  if (offers.length === 0) {
    return {
      installmentId: null,
      cetId: null,
      totalId: null,
      termId: null,
      scoreId: null,
    };
  }
  let installment = offers[0]!;
  let cet = offers[0]!;
  let total = offers[0]!;
  let term = offers[0]!;
  let score = offers[0]!;
  for (const o of offers) {
    if (Number(o.installmentValue) < Number(installment.installmentValue)) installment = o;
    if (Number(o.cet) < Number(cet.cet)) cet = o;
    if (Number(o.totalAmount) < Number(total.totalAmount)) total = o;
    if (o.term > term.term) term = o;
    if (Number(o.score) > Number(score.score)) score = o;
  }
  return {
    installmentId: installment.id,
    cetId: cet.id,
    totalId: total.id,
    termId: term.id,
    scoreId: score.id,
  };
}

export function FinancingSimulationDetailView({
  simulationId,
}: {
  simulationId: string;
}): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [sim, setSim] = useState<FinancingSimulationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("installment");
  const [applyingOfferId, setApplyingOfferId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFinancingSimulation(currentOrganizationId, simulationId);
      setSim(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar a simulação.");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, simulationId]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const applyForOffer = useCallback(
    async (offerId: string) => {
      if (!currentOrganizationId) return;
      setApplyError(null);
      setApplyingOfferId(offerId);
      try {
        const app = await createFinancingApplication(currentOrganizationId, {
          selectedOfferId: offerId,
        });
        router.push(`/financiamento/aplicacoes/${app.id}`);
      } catch (e) {
        setApplyError(e instanceof Error ? e.message : "Não foi possível criar a solicitação.");
      } finally {
        setApplyingOfferId(null);
      }
    },
    [currentOrganizationId, router]
  );

  const sortedOffers = useMemo(() => {
    if (!sim) return [];
    const arr = [...sim.offers];
    arr.sort((a, b) => {
      if (sort === "installment") {
        return Number(a.installmentValue) - Number(b.installmentValue);
      }
      if (sort === "cet") return Number(a.cet) - Number(b.cet);
      return Number(a.totalAmount) - Number(b.totalAmount);
    });
    return arr;
  }, [sim, sort]);

  const best = useMemo(() => computeBest(sim?.offers ?? []), [sim?.offers]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (loading) return <LoadingState label="Carregando simulação" compact />;
  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/financiamento")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }
  if (!sim) return <LoadingState label="Carregando simulação" compact />;

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/financiamento")}
          className="self-start gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Nova simulação
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ofertas para {sim.customerName}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Valor a financiar:{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              {formatBRL(sim.financedAmount)}
            </span>{" "}
            em{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              {sim.requestedTerm} meses
            </span>
            {sim.personType ? ` · ${sim.personType}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="font-medium">{sim.offers.length} oferta(s)</span>
          <span className="text-[var(--color-muted-foreground)]">
            de {new Set(sim.offers.map((o) => o.providerId)).size} financiador(es)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <span className="text-xs text-[var(--color-muted-foreground)]">Ordenar por</span>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 w-[170px]"
          >
            <option value="installment">{SORT_LABEL.installment}</option>
            <option value="cet">{SORT_LABEL.cet}</option>
            <option value="total">{SORT_LABEL.total}</option>
          </Select>
        </div>
      </div>

      {applyError ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {applyError}
        </p>
      ) : null}

      {sortedOffers.length === 0 ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">
          Nenhum financiador retornou oferta para esses parâmetros.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {sortedOffers.map((offer) => {
            const monthlyRate = Number(offer.monthlyRate);
            const cet = Number(offer.cet);
            const installmentValue = Number(offer.installmentValue);
            const badges: { label: string; tone: string; icon: JSX.Element }[] = [];
            if (offer.id === best.installmentId) {
              badges.push({
                label: "Menor parcela",
                tone: "bg-emerald-500 text-white",
                icon: <Wallet className="h-3 w-3" />,
              });
            }
            if (offer.id === best.cetId) {
              badges.push({
                label: "Melhor taxa",
                tone: "bg-sky-500 text-white",
                icon: <TrendingDown className="h-3 w-3" />,
              });
            }
            if (offer.id === best.termId) {
              badges.push({
                label: "Maior prazo",
                tone: "bg-indigo-500 text-white",
                icon: <Clock className="h-3 w-3" />,
              });
            }
            if (offer.id === best.scoreId) {
              badges.push({
                label: "Mais recomendado",
                tone: "bg-amber-500 text-white",
                icon: <Star className="h-3 w-3" />,
              });
            }

            return (
              <article
                key={offer.id}
                className="relative flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 pt-6 shadow-sm transition hover:border-emerald-500/40 hover:shadow-md"
              >
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${b.tone}`}
                      >
                        {b.icon}
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}

                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {offer.provider.logoUrl ? (
                      <img
                        src={offer.provider.logoUrl}
                        alt={offer.provider.name}
                        className="h-10 w-10 rounded-lg border border-[var(--color-border)] bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-muted-foreground)]">
                        {offer.provider.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-base font-semibold">{offer.provider.name}</p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        {MODE_LABEL[offer.provider.mode] ?? offer.provider.mode}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ELIGIBILITY_TONE[offer.eligibilityStatus] ?? ELIGIBILITY_TONE["ESTIMATED"]}`}
                  >
                    {ELIGIBILITY_LABEL[offer.eligibilityStatus] ?? offer.eligibilityStatus}
                  </span>
                </header>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    Parcela mensal
                  </p>
                  <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatBRL(installmentValue)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    em {offer.term}x · primeira parcela após 30 dias
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Taxa
                    </p>
                    <p className="font-semibold tabular-nums">{formatPct(monthlyRate, 2)} a.m.</p>
                    <p className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPct(monthlyToAnnual(monthlyRate), 2)} a.a.
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      CET
                    </p>
                    <p className="font-semibold tabular-nums">{formatPct(cet, 2)} a.m.</p>
                    <p className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPct(monthlyToAnnual(cet), 2)} a.a.
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Valor financiado
                    </p>
                    <p className="font-semibold tabular-nums">{formatBRL(offer.financedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Valor total
                    </p>
                    <p className="font-semibold tabular-nums">{formatBRL(offer.totalAmount)}</p>
                  </div>
                </div>

                {offer.notes ? (
                  <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-2.5 py-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                    {offer.notes}
                  </p>
                ) : null}

                <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70"
                    disabled={applyingOfferId !== null}
                    onClick={() => void applyForOffer(offer.id)}
                  >
                    {applyingOfferId === offer.id ? (
                      <>Criando…</>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Solicitar financiamento
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
