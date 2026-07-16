"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, MoreVertical, Plus, RefreshCw } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getFinancingKanban,
  transitionFinancingApplication,
  type FinancingApplicationListItem,
  type FinancingApplicationStatus,
  type FinancingKanbanBoard,
} from "@/lib/financing-api";

const STATUS_ORDER: FinancingApplicationStatus[] = [
  "CREATED",
  "AWAITING_DOCUMENTS",
  "DOCUMENTS_RECEIVED",
  "SUBMITTED_TO_BANK",
  "UNDER_REVIEW",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CONTRACT_SIGNED",
  "CREDIT_RELEASED",
  "COMPLETED",
];

const STATUS_LABEL: Record<FinancingApplicationStatus, string> = {
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

const STATUS_TONE: Record<FinancingApplicationStatus, string> = {
  CREATED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  AWAITING_DOCUMENTS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  DOCUMENTS_RECEIVED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  SUBMITTED_TO_BANK: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200",
  UNDER_REVIEW: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
  PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  CONTRACT_SIGNED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
  CREDIT_RELEASED: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200",
  COMPLETED: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
};

const ALLOWED_TRANSITIONS: Record<FinancingApplicationStatus, FinancingApplicationStatus[]> = {
  CREATED: ["AWAITING_DOCUMENTS", "DOCUMENTS_RECEIVED", "REJECTED"],
  AWAITING_DOCUMENTS: ["DOCUMENTS_RECEIVED", "REJECTED"],
  DOCUMENTS_RECEIVED: ["SUBMITTED_TO_BANK", "AWAITING_DOCUMENTS", "REJECTED"],
  SUBMITTED_TO_BANK: ["UNDER_REVIEW", "PENDING", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["PENDING", "APPROVED", "REJECTED"],
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED", "AWAITING_DOCUMENTS"],
  APPROVED: ["CONTRACT_SIGNED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  CONTRACT_SIGNED: ["CREDIT_RELEASED"],
  CREDIT_RELEASED: ["COMPLETED"],
  COMPLETED: [],
};

function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function FinancingKanbanView(): JSX.Element {
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [board, setBoard] = useState<FinancingKanbanBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!currentOrganizationId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getFinancingKanban(currentOrganizationId);
        setBoard(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao carregar Kanban.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentOrganizationId]
  );

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const transition = useCallback(
    async (id: string, to: FinancingApplicationStatus) => {
      if (!currentOrganizationId) return;
      setMovingId(id);
      setMenuOpenFor(null);
      try {
        await transitionFinancingApplication(currentOrganizationId, id, { to });
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao transicionar status.");
      } finally {
        setMovingId(null);
      }
    },
    [currentOrganizationId, load]
  );

  const totals = useMemo(() => {
    if (!board) return null;
    let count = 0;
    let approved = 0;
    let released = 0;
    for (const status of STATUS_ORDER) {
      count += board[status].length;
      if (
        status === "APPROVED" ||
        status === "CONTRACT_SIGNED" ||
        status === "CREDIT_RELEASED" ||
        status === "COMPLETED"
      ) {
        approved += board[status].length;
      }
      if (status === "CREDIT_RELEASED" || status === "COMPLETED") {
        released += board[status].length;
      }
    }
    return { count, approved, released };
  }, [board]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (loading) return <LoadingState label="Carregando Kanban" compact />;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitações de financiamento</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Arraste pelas colunas alterando o status pelo menu de ações. Cada movimento é registrado
            no histórico da solicitação.
          </p>
          {totals ? (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              <span className="font-medium text-[var(--color-foreground)]">{totals.count}</span>{" "}
              total ·{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {totals.approved}
              </span>{" "}
              aprovadas ·{" "}
              <span className="font-medium text-teal-600 dark:text-teal-400">
                {totals.released}
              </span>{" "}
              com crédito liberado
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Link
            href="/financiamento/nova"
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova simulação
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!board || Object.values(board).every((arr) => arr.length === 0) ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhuma solicitação ainda. Crie uma simulação e clique em &quot;Solicitar
            financiamento&quot; em uma das ofertas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const items = board[status];
            if (items.length === 0) return null;
            return (
              <section
                key={status}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3"
              >
                <header className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_TONE[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {items.map((app) => (
                    <KanbanCard
                      key={app.id}
                      app={app}
                      moving={movingId === app.id}
                      menuOpen={menuOpenFor === app.id}
                      onToggleMenu={() => setMenuOpenFor(menuOpenFor === app.id ? null : app.id)}
                      onTransition={(to) => void transition(app.id, to)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface KanbanCardProps {
  app: FinancingApplicationListItem;
  moving: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onTransition: (to: FinancingApplicationStatus) => void;
}

function KanbanCard({
  app,
  moving,
  menuOpen,
  onToggleMenu,
  onTransition,
}: KanbanCardProps): JSX.Element {
  const transitions = ALLOWED_TRANSITIONS[app.status];

  return (
    <article className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm transition hover:border-emerald-500/40">
      <Link href={`/financiamento/aplicacoes/${app.id}`} className="block space-y-2">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold">{app.simulation.customerName}</p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {app.provider.name} · {app.simulation.personType}
            </p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Parcela
            </p>
            <p className="font-semibold tabular-nums">
              {formatBRL(app.selectedOffer.installmentValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Prazo
            </p>
            <p className="font-semibold tabular-nums">{app.selectedOffer.term}x</p>
          </div>
        </div>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          {app._count.documents} documento(s) · atualizado{" "}
          {new Date(app.updatedAt).toLocaleDateString("pt-BR")}
        </p>
      </Link>
      {transitions.length > 0 && (
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Mover para outro status"
          className="absolute right-1 top-1 rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/60 disabled:opacity-50"
          disabled={moving}
        >
          {moving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>
      )}
      {menuOpen && transitions.length > 0 && (
        <div className="absolute right-1 top-9 z-10 w-48 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Mover para
          </p>
          {transitions.map((to) => (
            <button
              key={to}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTransition(to);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]/60"
            >
              {STATUS_LABEL[to]}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
