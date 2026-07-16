"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Flame,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { useOrganization } from "@/components/providers/organization-provider";
import { formatCpfCnpjDigits } from "@energivia/utils";
import {
  ACTIVITY_TONE_DOT_CLASS,
  ACTIVITY_TONE_TEXT_CLASS,
  formatNextStepSummary,
  lastActivityPresentation,
} from "@/lib/lead-activity";
import {
  createLead,
  getLeadsDashboardStats,
  listLeads,
  type DealStage,
  type LeadListItem,
  type LeadsDashboardStats,
  type PaginatedLeads,
} from "@/lib/leads-api";
import { DealStageBadge, STAGE_LABEL } from "./deal-stage-badge";
import {
  emptyLeadForm,
  leadFormSchema,
  leadFormToCreatePayload,
  type LeadFormValues,
} from "@/lib/lead-form-schema";
import { LeadContactFields } from "./lead-contact-fields";
import { ClientLeadDrawer } from "./client-lead-drawer";
import { SetNextStepDialog } from "./set-next-step-dialog";

type ViewMode = "clientes" | "pipeline";

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function formatDealValueDisplay(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }
  return "—";
}

type ActivityFilter = "all" | "7d" | "30d" | "stale";

const VIEW_COPY: Record<ViewMode, { title: string; subtitle: string }> = {
  clientes: {
    title: "Clientes",
    subtitle: "Gerencie contatos e acompanhe negociações",
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Acompanhe a evolução das negociações do funil comercial",
  },
};

function applyClientSideFilters(
  rows: LeadListItem[],
  status: DealStage | "",
  activity: ActivityFilter,
  chipNoProposal: boolean,
  chipOverdue: boolean,
  chipHot: boolean
): LeadListItem[] {
  return rows.filter((row) => {
    if (status && row.latestDealStage !== status) return false;

    const ref = row.latestDealUpdatedAt ?? row.updatedAt;
    const t = new Date(ref).getTime();
    const now = Date.now();
    const days = (now - t) / 86400000;

    if (activity === "7d" && days > 7) return false;
    if (activity === "30d" && days > 30) return false;
    if (activity === "stale" && days < 30) return false;

    if (chipNoProposal && (row.latestDealProposalCount ?? 0) > 0) return false;
    if (chipOverdue && !isOverdue(row.nextActionAt)) return false;
    if (chipHot && row.latestDealTemperature !== "HOT") return false;
    return true;
  });
}

export function LeadListView({ mode }: { mode: ViewMode }): JSX.Element {
  const copy = useMemo(() => VIEW_COPY[mode], [mode]);
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [list, setList] = useState<PaginatedLeads | null>(null);
  const [stats, setStats] = useState<LeadsDashboardStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<DealStage | "">("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [chipNoProposal, setChipNoProposal] = useState(false);
  const [chipOverdue, setChipOverdue] = useState(false);
  const [chipHot, setChipHot] = useState(false);

  const [nextStepOpen, setNextStepOpen] = useState(false);
  const [nextStepRow, setNextStepRow] = useState<LeadListItem | null>(null);

  const createForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: emptyLeadForm,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoadError(null);
    try {
      const [data, st] = await Promise.all([
        listLeads(currentOrganizationId, {
          page,
          pageSize: mode === "clientes" ? 50 : 20,
          search: appliedSearch || undefined,
        }),
        mode === "clientes" ? getLeadsDashboardStats(currentOrganizationId) : Promise.resolve(null),
      ]);
      setList(data);
      if (st) setStats(st);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar clientes");
    }
  }, [currentOrganizationId, page, appliedSearch, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNextStepModal(row: LeadListItem) {
    setNextStepRow(row);
    setNextStepOpen(true);
  }

  const submitCreate = createForm.handleSubmit(async (values) => {
    if (!currentOrganizationId) return;
    setCreateError(null);
    try {
      const created = (await createLead(
        currentOrganizationId,
        leadFormToCreatePayload(values)
      )) as { id: string };
      setCreateOpen(false);
      createForm.reset(emptyLeadForm);
      window.location.href = `/clientes/${created.id}`;
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar cliente");
    }
  });

  const rowsRaw: LeadListItem[] = list?.data ?? [];
  const filteredRows =
    mode === "clientes"
      ? applyClientSideFilters(
          rowsRaw,
          statusFilter,
          activityFilter,
          chipNoProposal,
          chipOverdue,
          chipHot
        )
      : rowsRaw;

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;

  if (!currentOrganizationId) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
        Selecione uma organização para ver os clientes.
      </div>
    );
  }

  if (mode === "pipeline") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="text-[var(--color-muted-foreground)]">{copy.subtitle}</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
            <CardDescription>Use a página Clientes para a nova visão.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">{copy.subtitle}</p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) {
              createForm.reset(emptyLeadForm);
              createForm.clearErrors();
              setCreateError(null);
            }
          }}
        >
          <Button type="button" onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            Novo cliente
          </Button>
          <DialogContent showCloseButton className="max-w-md">
            <DialogHeader className="pr-8">
              <DialogTitle>Novo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitCreate} className="grid gap-3">
              <div className="grid gap-3 py-2">
                <LeadContactFields
                  control={createForm.control}
                  errors={createForm.formState.errors}
                  idsPrefix="new-lead"
                />
                {createError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? "Salvando…" : "Criar cliente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <BarChart3 className="h-4 w-4 text-emerald-500" aria-hidden />
              Resumo
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Clique em um card para filtrar a lista pelo status da oportunidade.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {!stats ? (
            <LoadingState compact label="Carregando resumo" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  {
                    label: "Total",
                    value: stats.totalLeads,
                    icon: Users,
                    filterStage: "" as const,
                    hint: "Mostrar todos os clientes (status qualquer)",
                  },
                  {
                    label: "Propostas",
                    value: stats.dealsInProposal,
                    icon: BarChart3,
                    filterStage: "PROPOSAL" as const,
                    hint: "Filtrar por oportunidades em proposta",
                  },
                  {
                    label: "Negociação",
                    value: stats.dealsInNegotiation,
                    icon: BarChart3,
                    filterStage: "NEGOTIATION" as const,
                    hint: "Filtrar por oportunidades em negociação",
                  },
                  {
                    label: "Ganhos",
                    value: stats.dealsWon,
                    icon: BarChart3,
                    filterStage: "WON" as const,
                    hint: "Filtrar por oportunidades ganhas",
                  },
                ] as const
              ).map(({ label, value, icon: Icon, filterStage, hint }) => {
                const active =
                  filterStage === "" ? statusFilter === "" : statusFilter === filterStage;
                return (
                  <button
                    key={label}
                    type="button"
                    title={hint}
                    onClick={() => {
                      setStatusFilter(filterStage);
                      setPage(1);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)] ${
                      active
                        ? "border-[var(--color-ring)]/60 bg-[var(--color-accent)]/50 shadow-sm ring-1 ring-[var(--color-ring)]/35"
                        : "border-[var(--color-border)] bg-[var(--color-muted)]/15 hover:bg-[var(--color-muted)]/35"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {label}
                      </span>
                      <Icon
                        className="h-4 w-4 text-[var(--color-muted-foreground)] opacity-60"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                      {value}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4 text-emerald-500" aria-hidden />
            Busca e filtros
          </div>
          <form
            className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Input
                id="lead-search"
                label="Buscar"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nome, e-mail, CPF, empresa, WhatsApp…"
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Select
                label="Status"
                fullWidth={false}
                className="min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter((e.target.value || "") as DealStage | "")}
              >
                <option value="">Todos</option>
                {(Object.keys(STAGE_LABEL) as DealStage[]).map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Select
                label="Atividade"
                fullWidth={false}
                className="min-w-[140px]"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
              >
                <option value="all">Qualquer</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="stale">Sem atividade 30+ dias</option>
              </Select>
            </div>
            <Button type="submit" variant="outline" className="h-10">
              Buscar
            </Button>
          </form>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setChipNoProposal((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                chipNoProposal
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : "border-[var(--color-border)] bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              Sem proposta
            </button>
            <button
              type="button"
              onClick={() => setChipOverdue((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                chipOverdue
                  ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "border-[var(--color-border)] bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              Atrasados
            </button>
            <button
              type="button"
              onClick={() => setChipHot((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                chipHot
                  ? "border-orange-500 bg-orange-500/15 text-orange-900 dark:text-orange-200"
                  : "border-[var(--color-border)] bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              Quentes <Flame className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            Filtros de status, atividade e chips aplicam-se à página carregada (até 50 clientes).
            Use a busca para refinar no servidor.
          </p>
        </CardHeader>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lista de clientes</CardTitle>
          <CardDescription>Nome, status da oportunidade, atividade e valor</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : !list ? (
            <LoadingState compact label="Carregando clientes" />
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum cliente nesta visão. Ajuste filtros ou cadastre um novo cliente.
            </p>
          ) : (
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="py-3 pr-4 font-medium">Nome / Info</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Atividade</th>
                  <th className="py-3 pr-4 font-medium">Próximo passo</th>
                  <th className="py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[var(--color-border)]/70 transition hover:bg-[var(--color-muted)]/25"
                    onClick={() => setDrawerLeadId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDrawerLeadId(row.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--color-foreground)]">{row.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {row.email ?? "—"}
                        {row.cpfCnpj ? (
                          <>
                            {" · "}
                            {formatCpfCnpjDigits(row.cpfCnpj)}
                          </>
                        ) : null}
                      </p>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <DealStageBadge stage={row.latestDealStage} />
                        {row.latestDealTemperature === "HOT" ? (
                          <span className="inline-flex" title="Quente">
                            <Flame
                              className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400"
                              aria-hidden
                            />
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {(() => {
                        const act = lastActivityPresentation(
                          row.latestDealUpdatedAt ?? row.updatedAt
                        );
                        return (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${ACTIVITY_TONE_DOT_CLASS[act.tone]}`}
                              aria-hidden
                            />
                            <span className={`text-sm ${ACTIVITY_TONE_TEXT_CLASS[act.tone]}`}>
                              {act.label}
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.latestDealStage === "LOST" ? (
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            {formatNextStepSummary(
                              row.nextActionAt,
                              row.nextActionType,
                              row.latestDealStage
                            )}
                          </span>
                        ) : row.nextActionAt ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm ${
                              isOverdue(row.nextActionAt)
                                ? "font-medium text-amber-800 dark:text-amber-300"
                                : "text-[var(--color-foreground)]"
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            {formatNextStepSummary(
                              row.nextActionAt,
                              row.nextActionType,
                              row.latestDealStage
                            )}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 border-dashed text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNextStepModal(row);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Definir
                          </Button>
                        )}
                        {isOverdue(row.nextActionAt) && row.latestDealStage !== "LOST" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            Atrasado
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                      {formatDealValueDisplay(row.latestDealValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {list && list.meta.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!list.meta.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Página {list.meta.page} de {list.meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!list.meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        Dica: clique na linha para abrir o painel lateral com detalhes e ações rápidas.
      </p>

      {nextStepRow ? (
        <SetNextStepDialog
          open={nextStepOpen}
          onOpenChange={(o) => {
            setNextStepOpen(o);
            if (!o) setNextStepRow(null);
          }}
          organizationId={currentOrganizationId}
          leadId={nextStepRow.id}
          dealId={nextStepRow.latestDealId}
          leadName={nextStepRow.name}
          onSaved={() => load()}
        />
      ) : null}

      <ClientLeadDrawer
        open={Boolean(drawerLeadId)}
        onOpenChange={(o) => {
          if (!o) setDrawerLeadId(null);
        }}
        organizationId={currentOrganizationId}
        leadId={drawerLeadId}
      />
    </div>
  );
}
