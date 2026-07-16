"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, MoreVertical, RefreshCw, Search } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPlatformKanban,
  transitionFinancingApplication,
  type FinancingApplicationStatus,
  type PlatformApplicationRow,
} from "@/lib/financing-api";

type Board = Record<FinancingApplicationStatus, PlatformApplicationRow[]>;

const STATUS_ORDER: FinancingApplicationStatus[] = [
  "CREATED",
  "AWAITING_DOCUMENTS",
  "DOCUMENTS_RECEIVED",
  "SUBMITTED_TO_BANK",
  "UNDER_REVIEW",
  "PENDING",
  "APPROVED",
  "CONTRACT_SIGNED",
  "CREDIT_RELEASED",
  "REJECTED",
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
  CREATED: "bg-slate-100 text-slate-800",
  AWAITING_DOCUMENTS: "bg-amber-100 text-amber-800",
  DOCUMENTS_RECEIVED: "bg-sky-100 text-sky-800",
  SUBMITTED_TO_BANK: "bg-indigo-100 text-indigo-800",
  UNDER_REVIEW: "bg-violet-100 text-violet-800",
  PENDING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  CONTRACT_SIGNED: "bg-teal-100 text-teal-800",
  CREDIT_RELEASED: "bg-emerald-200 text-emerald-900",
  COMPLETED: "bg-slate-200 text-slate-900",
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

function formatBRL(value: number | string | null): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function PlatformFinancingQueueView(): JSX.Element {
  const { currentOrganizationId, user, loading: orgLoading } = useOrganization();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!currentOrganizationId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getPlatformKanban(currentOrganizationId);
        setBoard(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao carregar fila.");
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

  const allRows = useMemo(() => {
    if (!board) return [] as PlatformApplicationRow[];
    return STATUS_ORDER.flatMap((s) => board[s]);
  }, [board]);

  const providerOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of allRows) set.set(r.provider.id, r.provider.name);
    return Array.from(set.entries());
  }, [allRows]);

  const tenantOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of allRows) set.set(r.tenant.id, r.tenant.name);
    return Array.from(set.entries());
  }, [allRows]);

  const filteredBoard = useMemo<Board | null>(() => {
    if (!board) return null;
    const q = search.trim().toLowerCase();
    const result = Object.fromEntries(
      STATUS_ORDER.map((status) => [
        status,
        board[status].filter((row) => {
          if (providerFilter && row.provider.id !== providerFilter) return false;
          if (tenantFilter && row.tenant.id !== tenantFilter) return false;
          if (q) {
            const hay =
              `${row.simulation.customerName} ${row.tenant.name} ${row.provider.name} ${row.simulation.cpfCnpj ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        }),
      ])
    ) as Board;
    return result;
  }, [board, search, providerFilter, tenantFilter]);

  const transition = useCallback(
    async (id: string, to: FinancingApplicationStatus) => {
      if (!currentOrganizationId) return;
      setMovingId(id);
      setMenuOpenFor(null);
      try {
        await transitionFinancingApplication(currentOrganizationId, id, { to });
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao mover status.");
      } finally {
        setMovingId(null);
      }
    },
    [currentOrganizationId, load]
  );

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;

  if (user?.role !== "PLATFORM") {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        Apenas operadores Energivia (PLATFORM) podem acessar esta área.
      </p>
    );
  }

  if (loading) return <LoadingState label="Carregando fila global" compact />;

  const totalCount = filteredBoard
    ? Object.values(filteredBoard).reduce((acc, arr) => acc + arr.length, 0)
    : 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fila de Financiamentos</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Cross-tenant — Energivia opera com cada banco. Mova as solicitações conforme o ciclo
            evolui; mudanças são refletidas para o integrador originador.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, integrador, banco ou CPF/CNPJ"
            className="pl-9"
          />
        </div>
        <Select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
          <option value="">Todos os financiadores</option>
          {providerOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
          <option value="">Todos os integradores</option>
          {tenantOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {totalCount} solicitação(ões) {filteredBoard !== board ? "(filtradas)" : "no total"}
      </p>

      {!filteredBoard || totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhuma solicitação corresponde aos filtros atuais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const items = filteredBoard[status];
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
                    <PlatformKanbanCard
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

interface CardProps {
  app: PlatformApplicationRow;
  moving: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onTransition: (to: FinancingApplicationStatus) => void;
}

function PlatformKanbanCard({
  app,
  moving,
  menuOpen,
  onToggleMenu,
  onTransition,
}: CardProps): JSX.Element {
  const transitions = ALLOWED_TRANSITIONS[app.status];

  return (
    <article className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm transition hover:border-emerald-500/40">
      <Link href={`/plataforma/aplicacoes/${app.id}`} className="block space-y-2">
        <header className="flex items-start justify-between gap-2 pr-6">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold">{app.simulation.customerName}</p>
            <p className="line-clamp-1 text-[11px] text-[var(--color-muted-foreground)]">
              <Building2 className="mr-1 inline h-3 w-3" /> {app.tenant.name}
              {" · "}
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
              Financiado
            </p>
            <p className="font-semibold tabular-nums">
              {formatBRL(app.selectedOffer.financedAmount)}
            </p>
          </div>
        </div>
        {app.commission ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            Comissão Energivia: {formatBRL(app.commission.grossCommissionBrl)} (
            {app.commission.status})
          </p>
        ) : null}
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
