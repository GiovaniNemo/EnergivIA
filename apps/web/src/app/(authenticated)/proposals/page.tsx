"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useOrganization } from "@/components/providers/organization-provider";
import { listProposals, type DealStage, type ProposalListItem } from "@/lib/leads-api";
import Link from "next/link";
import { cn } from "@energivia/utils";
import {
  Briefcase,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutTemplate,
  Package,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { DealStageBadge } from "@/app/(authenticated)/leads/deal-stage-badge";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  VIEWED: "Visualizada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

function proposalStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-none";
  switch (status) {
    case "DRAFT":
      return `${base} border-[var(--color-border)] bg-[var(--color-muted)]/90 text-[var(--color-muted-foreground)]`;
    case "SENT":
      return `${base} border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-200`;
    case "VIEWED":
      return `${base} border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-200`;
    case "ACCEPTED":
      return `${base} border-emerald-500/40 bg-emerald-500/12 text-emerald-950 dark:text-emerald-200`;
    case "REJECTED":
      return `${base} border-red-500/35 bg-red-500/10 text-red-950 dark:text-red-200`;
    default:
      return `${base} border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)]`;
  }
}

const linkBtnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

function formatBrl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatProposalListTitle(title: string): string {
  return title.replace(/\s*[—–]\s*/g, " · ").trim();
}

function MetricTile({
  label,
  value,
  icon: Icon,
  muted,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  muted?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border px-3 py-2.5 sm:min-h-[4.25rem]",
        muted
          ? "border-[var(--color-border)]/80 bg-[var(--color-muted)]/20"
          : "border-emerald-500/20 bg-emerald-500/[0.06] dark:border-emerald-400/15 dark:bg-emerald-500/[0.05]"
      )}
    >
      <span className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
        <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        {label}
      </span>
      <span
        className={cn(
          "mt-1 tabular-nums tracking-tight text-[var(--color-foreground)]",
          muted ? "text-sm font-medium" : "text-base font-semibold sm:text-lg"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function parseDealStage(raw: string): DealStage | null {
  const allowed: DealStage[] = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  return allowed.includes(raw as DealStage) ? (raw as DealStage) : null;
}

export default function ProposalsPage(): JSX.Element {
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    listProposals(currentOrganizationId)
      .then(setItems)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Não foi possível carregar propostas.")
      )
      .finally(() => setLoading(false));
  }, [currentOrganizationId]);

  const stats = useMemo(() => {
    let draft = 0;
    let inFlight = 0;
    let quotedSum = 0;
    let quotedCount = 0;
    let marginSum = 0;
    let marginCount = 0;
    for (const p of items) {
      if (p.status === "DRAFT") draft += 1;
      if (p.status === "SENT" || p.status === "VIEWED") inFlight += 1;
      if (p.quotedValueBrl != null) {
        quotedSum += p.quotedValueBrl;
        quotedCount += 1;
      }
      if (p.marginBrl != null) {
        marginSum += p.marginBrl;
        marginCount += 1;
      }
    }
    return {
      total: items.length,
      draft,
      inFlight,
      quotedSum,
      quotedCount,
      marginSum,
      marginCount,
    };
  }, [items]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;

  if (!currentOrganizationId) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Selecione uma organização para ver as propostas.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-10">
      <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-muted)]/50 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Propostas</h1>
              <p className="mt-1 max-w-md text-sm text-[var(--color-muted-foreground)]">
                PDF, templates e números do funil — tudo por negócio e cliente.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pipeline"
              className={cn(
                linkBtnBase,
                "h-10 bg-emerald-600 px-4 text-white hover:bg-emerald-500"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Criar no funil
            </Link>
            <Link
              href="/propostas/templates"
              className={cn(
                linkBtnBase,
                "h-10 border border-[var(--color-border)] bg-[var(--color-background)] px-4 hover:bg-[var(--color-muted)]/30"
              )}
            >
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </Link>
          </div>
        </div>

        {!loading && stats.total > 0 ? (
          <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)]/60 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { k: "Propostas", v: String(stats.total) },
              { k: "Rascunhos", v: String(stats.draft) },
              { k: "Enviada / vista", v: String(stats.inFlight) },
              ...(stats.quotedCount > 0
                ? [{ k: "Soma valor cliente", v: formatBrl(stats.quotedSum) }]
                : []),
              ...(stats.marginCount > 0
                ? [{ k: "Soma margem (kit)", v: formatBrl(stats.marginSum) }]
                : []),
            ].map((cell) => (
              <div key={cell.k} className="bg-[var(--color-card)] px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {cell.k}
                </p>
                <p className="mt-0.5 font-semibold tabular-nums text-[var(--color-foreground)]">
                  {cell.v}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <Card className="overflow-hidden border-[var(--color-border)] shadow-sm">
        <CardHeader className="border-b border-[var(--color-border)] pb-3 pt-4">
          <CardTitle className="text-base font-semibold">Todas as propostas</CardTitle>
          <CardDescription className="text-sm text-[var(--color-muted-foreground)]">
            Funil e ficha do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="py-10">
              <LoadingState label="Carregando propostas" compact />
            </div>
          ) : error ? (
            <p className="py-6 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]/50 ring-1 ring-[var(--color-border)]">
                <FileText className="h-8 w-8 text-[var(--color-muted-foreground)]" />
              </div>
              <div className="max-w-sm space-y-1">
                <p className="font-medium text-[var(--color-foreground)]">Nenhuma proposta ainda</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Abra um negócio em Negociações, rode a simulação e conclua com &quot;Criar
                  proposta&quot;, ou crie pela ficha do cliente.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Link
                  href="/pipeline"
                  className={cn(
                    linkBtnBase,
                    "h-10 bg-[var(--color-primary)] px-4 py-2 text-[var(--color-primary-foreground)] hover:opacity-90"
                  )}
                >
                  Ir para negociações
                </Link>
                <Link
                  href="/clientes"
                  className={cn(
                    linkBtnBase,
                    "h-10 border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 hover:bg-[var(--color-accent)]"
                  )}
                >
                  Ver clientes
                </Link>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((p) => {
                const dealStage = parseDealStage(p.deal.stage);
                const hasValue = p.quotedValueBrl != null;
                const equipLabel =
                  p.equipmentSubtotalBrl != null
                    ? formatBrl(p.equipmentSubtotalBrl)
                    : p.kitLineCount > 0
                      ? "—"
                      : "Sem kit";
                const marginLabel = p.marginBrl != null ? formatBrl(p.marginBrl) : "—";
                return (
                  <li key={p.id}>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/40 p-4 transition-colors hover:border-emerald-500/25 hover:bg-[var(--color-muted)]/[0.2] sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)]/60 text-emerald-600 sm:flex dark:text-emerald-400">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <Link
                              href={`/propostas/${p.id}`}
                              className="group/title inline-flex max-w-full items-start gap-1.5 text-[0.95rem] font-semibold leading-snug text-[var(--color-foreground)] hover:text-emerald-600 dark:hover:text-emerald-400 sm:text-base"
                            >
                              <span className="min-w-0 break-words">
                                {formatProposalListTitle(p.title)}
                              </span>
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover/title:opacity-100" />
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                              <span className="inline-flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                <Link
                                  href={`/clientes/${p.deal.lead.id}`}
                                  className="font-medium text-[var(--color-foreground)]/90 hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
                                >
                                  {p.deal.lead.name}
                                </Link>
                              </span>
                              <span className="text-[var(--color-border)]" aria-hidden>
                                ·
                              </span>
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Briefcase
                                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                                  aria-hidden
                                />
                                <span className="truncate">{p.deal.title}</span>
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className={proposalStatusBadgeClass(p.status)}>
                                {STATUS_LABEL[p.status] ?? p.status}
                              </span>
                              <DealStageBadge stage={dealStage} />
                              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                <span className="tabular-nums">
                                  até {new Date(p.validUntil).toLocaleDateString("pt-BR")}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full shrink-0 space-y-2 lg:max-w-md lg:min-w-[300px]">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
                            <MetricTile
                              label="Valor cliente"
                              value={hasValue ? formatBrl(p.quotedValueBrl!) : "—"}
                              icon={CircleDollarSign}
                              muted={!hasValue}
                            />
                            <MetricTile
                              label="Equipamentos"
                              value={equipLabel}
                              icon={Package}
                              muted={p.equipmentSubtotalBrl == null}
                            />
                            <MetricTile
                              label="Margem (est.)"
                              value={marginLabel}
                              icon={TrendingUp}
                              muted={p.marginBrl == null}
                            />
                          </div>
                          <p className="text-center text-[0.7rem] text-[var(--color-muted-foreground)] sm:text-right">
                            {p.kitLineCount === 0
                              ? "Nenhuma linha de kit gravada"
                              : `${p.kitLineCount} linha${p.kitLineCount === 1 ? "" : "s"} no catálogo`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
