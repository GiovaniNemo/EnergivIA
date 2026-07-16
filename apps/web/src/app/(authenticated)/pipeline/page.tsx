"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  MessageCircle,
  Phone,
} from "lucide-react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  createDeal,
  createLead,
  listLeads,
  patchDeal,
  waMeUrl,
  type DealStage as ApiDealStage,
  type LeadListItem,
} from "@/lib/leads-api";
import { CreateDealModal } from "./CreateDealModal";
import { useDeals, type Deal, type DealStage } from "./use-deals";
import { useProposalStudy } from "@/components/pipeline/proposal-study-provider";
import { proposalStudyBridge } from "@/components/pipeline/proposal-study-bridge";
import { getMembers } from "@/lib/organizations-api";
import { KanbanBoard } from "./KanbanBoard";
import { PipelineTableView } from "./PipelineTableView";
import { PipelinePrioridadesView } from "./PipelinePrioridadesView";
import type { ClosedDealStatus } from "@/lib/pipeline-deal";
import { CloseDealModal } from "./CloseDealModal";
import { DealDetailDialog } from "./DealDetailDialog";

const STAGE_ORDER: DealStage[] = ["novo", "contato", "proposta", "negociacao", "fechado"];

const STAGE_LABEL: Record<DealStage, string> = {
  novo: "Novo",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
};

const STALLED_DAYS_THRESHOLD = 7;

const STAGE_BAR_WIDTH: Record<DealStage, string> = {
  novo: "20%",
  contato: "40%",
  proposta: "60%",
  negociacao: "80%",
  fechado: "100%",
};

const STAGE_BAR_COLOR: Record<DealStage, string> = {
  novo: "bg-slate-400",
  contato: "bg-blue-600",
  proposta: "bg-violet-600",
  negociacao: "bg-emerald-600",
  fechado: "bg-slate-700",
};

function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  return date.getTime() < Date.now();
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNextActionCompact(date: Date | null): string {
  if (!date) return "Não agendado";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (dayDiff === 0) return `Hoje ${time}`;
  if (dayDiff === 1) return `Amanhã ${time}`;
  if (dayDiff === -1) return `Ontem ${time}`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ` ${time}`;
}

function daysSince(date: Date): number {
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getAdvanceStage(current: DealStage): DealStage | null {
  if (current === "fechado") return null;
  const idx = STAGE_ORDER.indexOf(current);
  const next = STAGE_ORDER[idx + 1];
  return next ?? null;
}

function mapApiStage(stage: ApiDealStage | null): DealStage {
  switch (stage) {
    case "NEW":
      return "novo";
    case "CONTACTED":
      return "contato";
    case "PROPOSAL":
      return "proposta";
    case "NEGOTIATION":
      return "negociacao";
    case "WON":
    case "LOST":
      return "fechado";
    default:
      return "novo";
  }
}

function mapUiStageToApi(stage: DealStage): ApiDealStage {
  switch (stage) {
    case "novo":
      return "NEW";
    case "contato":
      return "CONTACTED";
    case "proposta":
      return "PROPOSAL";
    case "negociacao":
      return "NEGOTIATION";
    case "fechado":
      return "WON";
  }
}

function formatWhatsappLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") ? `+${d}` : `+55${d}`;
}

function resolveProposalFollowUpStatus(lead: LeadListItem): Deal["proposalFollowUpStatus"] {
  const proposalCount = lead.latestDealProposalCount ?? 0;
  if (proposalCount === 0) return "none";
  if ((lead.latestDealProposalClientViewCount ?? 0) > 0 || lead.latestDealProposalClientViewedAt) {
    return "viewed";
  }
  if (lead.latestDealProposalStatus === "SENT" || lead.latestDealProposalSentAt) {
    return "waiting";
  }
  return "sent";
}

type NextBestAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function urgencyScore(deal: Deal): number {
  let score = 0;
  const stalledDays = daysSince(deal.recentAt);
  if (isOverdue(deal.nextStepDate)) score += 1000;
  if (!deal.hasProposal) score += 250;
  if (deal.proposalFollowUpStatus === "waiting") score += 200;
  if (deal.proposalFollowUpStatus === "viewed") score += 160;
  score += Math.min(stalledDays, 30) * 8;
  if (deal.nextStepDate) {
    const hoursToNext = (deal.nextStepDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursToNext >= 0 && hoursToNext <= 48) score += 120;
  }
  return score;
}

function withStageOrder(deals: Deal[]): Deal[] {
  const buckets = new Map<string, Deal[]>();
  for (const deal of deals) {
    const lane = deal.stage === "fechado" ? `fechado:${deal.status ?? "lost"}` : deal.stage;
    const bucket = buckets.get(lane) ?? [];
    bucket.push(deal);
    buckets.set(lane, bucket);
  }
  const next: Deal[] = [];
  for (const stage of STAGE_ORDER) {
    if (stage === "fechado") {
      const closedRows: ClosedDealStatus[] = [
        "won",
        "lost",
        "disqualified",
        "postponed",
        "cancelled",
      ];
      for (const closedStatus of closedRows) {
        const laneDeals = (buckets.get(`fechado:${closedStatus}`) ?? [])
          .slice()
          .sort((a, b) => urgencyScore(b) - urgencyScore(a));
        for (let i = 0; i < laneDeals.length; i += 1) {
          next.push({ ...laneDeals[i]!, status: closedStatus, order: i });
        }
      }
      continue;
    }
    const stageDeals = (buckets.get(stage) ?? [])
      .slice()
      .sort((a, b) => urgencyScore(b) - urgencyScore(a));
    for (let i = 0; i < stageDeals.length; i += 1) {
      next.push({ ...stageDeals[i]!, status: undefined, order: i });
    }
  }
  return next;
}

function stageToClosedStatus(stage: ApiDealStage | null): ClosedDealStatus | undefined {
  if (stage === "WON") return "won";
  if (stage === "LOST") return "lost";
  return undefined;
}

export default function PipelinePage(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialDealParamRef = useRef(searchParams.get("id"));
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const { deals, setDeals, replaceDeals, updateDealStage, updateDealProposalStatus } = useDeals([]);
  const { openStudyForDeal } = useProposalStudy();
  const [proposalBusyLeadId, setProposalBusyLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberLoadError, setMemberLoadError] = useState<string | null>(null);
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [highlightDealId, setHighlightDealId] = useState<string | null>(null);
  const [actionsMenu, setActionsMenu] = useState<{
    dealId: string;
    anchorEl: HTMLElement;
  } | null>(null);
  const [assigneeMenu, setAssigneeMenu] = useState<{
    dealId: string;
    anchorEl: HTMLElement;
  } | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeModalDeal, setCloseModalDeal] = useState<Deal | null>(null);
  const [closeModalStatus, setCloseModalStatus] = useState<ClosedDealStatus | null>(null);
  const [closeModalFromStage, setCloseModalFromStage] = useState<DealStage | undefined>(undefined);
  const [closeModalFromStatus, setCloseModalFromStatus] = useState<ClosedDealStatus | undefined>(
    undefined
  );
  const [assignees, setAssignees] = useState<
    Array<{ userId: string; name: string; subtitle?: string }>
  >([]);
  const [fechadoExpanded, setFechadoExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "noProposal">("all");
  const [activeView, setActiveView] = useState<"kanban" | "tabela" | "prioridades">("kanban");
  const [detailDealId, setDetailDealId] = useState<string | null>(null);

  useEffect(() => {
    const dealParam = initialDealParamRef.current;
    if (!dealParam || deals.length === 0) return;
    const exists = deals.some((d) => d.id === dealParam);
    if (exists) {
      setDetailDealId(dealParam);
    }
    initialDealParamRef.current = null;
  }, [deals]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("id");
    if (detailDealId === current) return;
    if (detailDealId) {
      params.set("id", detailDealId);
    } else {
      params.delete("id");
    }
    const next = params.toString();
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [detailDealId, pathname, router, searchParams]);

  const loadDeals = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listLeads(currentOrganizationId, { page: 1, pageSize: 200 });

      const mapped = list.data.map((lead: LeadListItem): Deal => {
        const whatsappLabel = formatWhatsappLabel(lead.whatsapp);
        const nextDate = lead.nextActionAt ? new Date(lead.nextActionAt) : new Date(lead.updatedAt);
        const estimatedValueRaw = lead.latestDealValue ? Number(lead.latestDealValue) : 0;
        const estimatedValue = Number.isFinite(estimatedValueRaw) ? estimatedValueRaw : 0;
        return {
          id: lead.id,
          leadId: lead.id,
          dealId: lead.latestDealId ?? null,
          clientName: lead.name,
          contact: lead.email?.trim() || whatsappLabel || "Sem contato",
          whatsapp: lead.whatsapp ?? null,
          stage: mapApiStage(lead.latestDealStage),
          status: stageToClosedStatus(lead.latestDealStage),
          order: 0,
          value: estimatedValue,
          nextStepDate: nextDate,
          recentAt: new Date(lead.updatedAt),
          hasProposal: (lead.latestDealProposalCount ?? 0) > 0,
          latestProposalId: lead.latestDealProposalId ?? null,
          assigneeUserId: lead.latestDealAssignedUserId ?? null,
          assigneeName: lead.latestDealAssignedUserName ?? null,
          originFromSimulation: (lead.latestDealProposalCount ?? 0) > 0,
          proposalFollowUpStatus: resolveProposalFollowUpStatus(lead),
        };
      });

      replaceDeals(withStageOrder(mapped));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar negociações");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, replaceDeals]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    if (!currentOrganizationId) return;
    let alive = true;
    void (async () => {
      try {
        setMemberLoadError(null);
        const rows = await getMembers(currentOrganizationId);
        if (!alive) return;
        const options = rows
          .filter((m) => m.status === "ACCEPTED" && Boolean(m.userId))
          .map((m) => ({
            userId: m.userId!,
            name: m.name?.trim() || m.email?.trim() || "Usuário",
            subtitle: m.email?.trim() || undefined,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setAssignees(options);
      } catch (e) {
        if (!alive) return;
        setAssignees([]);
        setMemberLoadError(
          e instanceof Error ? e.message : "Não foi possível carregar usuários da organização."
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentOrganizationId]);

  useEffect(() => {
    proposalStudyBridge.setPipelineHooks({
      updateDealStage,
      updateDealProposalStatus,
    });
    proposalStudyBridge.setOnPipelineReload(() => {
      void loadDeals();
    });
    proposalStudyBridge.setOnProposalBusy(({ leadId, loading }) => {
      setProposalBusyLeadId(loading && leadId ? leadId : null);
    });
    return () => {
      proposalStudyBridge.setPipelineHooks(null);
      proposalStudyBridge.setOnPipelineReload(null);
      proposalStudyBridge.setOnProposalBusy(null);
    };
  }, [updateDealStage, updateDealProposalStatus, loadDeals]);

  const summary = useMemo(() => {
    const openDeals = deals.filter((d) => d.stage !== "fechado");
    const now = Date.now();
    const followUpWindowMs = 1000 * 60 * 60 * 24 * 2;
    const totalInNegotiation = openDeals.reduce((sum, d) => sum + d.value, 0);
    const overdueDeals = openDeals.filter((d) => isOverdue(d.nextStepDate)).length;
    const stalledDeals = openDeals.filter((d) => {
      const daysWithoutUpdates = (now - d.recentAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysWithoutUpdates >= STALLED_DAYS_THRESHOLD;
    }).length;
    const noProposalDeals = openDeals.filter((d) => !d.hasProposal).length;
    const upcomingFollowUps = openDeals.filter((d) => {
      if (!d.nextStepDate) return false;
      const diffMs = d.nextStepDate.getTime() - now;
      return diffMs >= 0 && diffMs <= followUpWindowMs;
    }).length;
    return {
      totalInNegotiation,
      overdueDeals,
      stalledDeals,
      noProposalDeals,
      upcomingFollowUps,
    };
  }, [deals]);

  const openDealsCount = useMemo(() => deals.filter((d) => d.stage !== "fechado").length, [deals]);

  const stageValues = useMemo(() => {
    const map = { novo: 0, contato: 0, proposta: 0, negociacao: 0, fechado: 0 } as Record<
      DealStage,
      number
    >;
    for (const deal of deals) map[deal.stage] = (map[deal.stage] ?? 0) + deal.value;
    return map;
  }, [deals]);

  const clientOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; contact: string; whatsapp: string | null }
    >();
    for (const deal of deals) {
      if (!map.has(deal.leadId)) {
        map.set(deal.leadId, {
          id: deal.leadId,
          name: deal.clientName,
          contact: deal.contact,
          whatsapp: deal.whatsapp,
        });
      }
    }
    return [...map.values()];
  }, [deals]);

  async function updateDealStageOrderMock(
    id: string,
    newStage: DealStage,
    newOrder: number
  ): Promise<void> {
    void id;
    void newStage;
    void newOrder;
    await Promise.resolve();
  }

  async function moveDeal(id: string, stage: DealStage): Promise<void> {
    const current = deals.find((d) => d.id === id);
    if (!current) return;

    const prevStage = current.stage;
    updateDealStage(id, stage);

    if (!currentOrganizationId || !current.dealId) return;

    setUpdatingDealId(id);
    try {
      await patchDeal(currentOrganizationId, current.dealId, { stage: mapUiStageToApi(stage) });
    } catch {
      updateDealStage(id, prevStage);
    } finally {
      setUpdatingDealId(null);
    }
  }

  async function commitDnDDrop(params: {
    item: Deal;
    fromStage: DealStage;
    toStage: DealStage;
    fromStatus?: ClosedDealStatus;
    toStatus?: ClosedDealStatus;
    fromOrder: number;
    newOrder: number;
  }): Promise<void> {
    const { item, fromStage, toStage, fromStatus, toStatus, newOrder } = params;
    await updateDealStageOrderMock(item.id, toStage, newOrder);
    if (toStage === "fechado" && toStatus) {
      setCloseModalDeal(item);
      setCloseModalStatus(toStatus);
      setCloseModalFromStage(fromStage);
      setCloseModalFromStatus(fromStatus);
      setCloseModalOpen(true);
      return;
    }
    if (!currentOrganizationId || !item.dealId) return;
    if (fromStage !== toStage) {
      try {
        await patchDeal(currentOrganizationId, item.dealId, {
          stage: mapUiStageToApi(toStage),
          lostReason: null,
        });
      } catch {
        await loadDeals();
      }
    }
  }

  function handleCloseDealModalCancel(): void {
    setCloseModalOpen(false);
    setCloseModalDeal(null);
    setCloseModalStatus(null);
    setCloseModalFromStage(undefined);
    setCloseModalFromStatus(undefined);
    void loadDeals();
  }

  async function updateDealCloseDetails(input: {
    id: string;
    status: ClosedDealStatus;
    reason?: string;
    finalValue?: number;
    postponedDate?: string;
    note?: string;
  }): Promise<void> {
    if (!currentOrganizationId) return;
    const deal = deals.find((d) => d.id === input.id);
    if (!deal?.dealId) return;
    await new Promise((r) => setTimeout(r, 150));
    const normalizedReason = input.reason?.toLowerCase() ?? "";
    const lostReason =
      input.status === "won"
        ? null
        : normalizedReason.includes("price")
          ? "PRICE"
          : normalizedReason.includes("competitor")
            ? "COMPETITOR"
            : normalizedReason.includes("interest")
              ? "NOT_INTERESTED"
              : "NO_RESPONSE";

    await patchDeal(currentOrganizationId, deal.dealId, {
      stage: input.status === "won" ? "WON" : "LOST",
      value: input.status === "won" && input.finalValue != null ? input.finalValue : undefined,
      lostReason,
      nextActionAt:
        input.status === "postponed" && input.postponedDate ? input.postponedDate : null,
      nextActionType: input.status === "postponed" ? (input.note ?? "Follow-up adiado") : undefined,
    });
    await loadDeals();
  }

  async function handleCloseDealModalConfirm(input: {
    id: string;
    status: ClosedDealStatus;
    reason?: string;
    finalValue?: number;
    postponedDate?: string;
    note?: string;
  }): Promise<void> {
    try {
      await updateDealCloseDetails(input);
    } finally {
      setCloseModalOpen(false);
      setCloseModalDeal(null);
      setCloseModalStatus(null);
      setCloseModalFromStage(undefined);
      setCloseModalFromStatus(undefined);
    }
  }

  async function assignDeal(deal: Deal, assignedUserId: string | null): Promise<void> {
    if (!currentOrganizationId || !deal.dealId) return;
    const selectedAssignee = assignees.find((a) => a.userId === assignedUserId);
    const previousAssignee = {
      assigneeUserId: deal.assigneeUserId ?? null,
      assigneeName: deal.assigneeName ?? null,
    };
    replaceDeals(
      deals.map((d) =>
        d.id === deal.id
          ? {
              ...d,
              assigneeUserId: assignedUserId,
              assigneeName: assignedUserId ? (selectedAssignee?.name ?? null) : null,
            }
          : d
      )
    );
    try {
      await patchDeal(currentOrganizationId, deal.dealId, { assignedUserId });
    } catch {
      replaceDeals(
        deals.map((d) =>
          d.id === deal.id
            ? {
                ...d,
                assigneeUserId: previousAssignee.assigneeUserId,
                assigneeName: previousAssignee.assigneeName,
              }
            : d
        )
      );
    }
  }

  function openWhatsapp(deal: Deal): void {
    if (!deal.whatsapp) return;
    const url = waMeUrl(
      deal.whatsapp,
      `Olá ${deal.clientName}, podemos avançar com sua proposta de energia solar?`
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function resolveNextBestAction(deal: Deal): NextBestAction {
    const nextStage = getAdvanceStage(deal.stage);
    if (!deal.hasProposal) {
      return {
        label: proposalBusyLeadId === deal.leadId ? "Calculando economia..." : "Criar proposta",
        disabled: proposalBusyLeadId === deal.leadId,
        onClick: () => {
          void openStudyForDeal(deal);
        },
      };
    }
    if (
      (deal.proposalFollowUpStatus === "waiting" || deal.proposalFollowUpStatus === "viewed") &&
      deal.whatsapp
    ) {
      return {
        label: "Fazer follow-up no WhatsApp",
        onClick: () => openWhatsapp(deal),
      };
    }
    if (deal.latestProposalId) {
      const proposalId = deal.latestProposalId;
      return {
        label: "Abrir proposta",
        onClick: () => router.push(`/propostas/${proposalId}`),
      };
    }
    if (nextStage) {
      return {
        label: `Avançar para ${STAGE_LABEL[nextStage]}`,
        disabled: updatingDealId === deal.id,
        onClick: () => {
          void moveDeal(deal.id, nextStage);
        },
      };
    }
    return {
      label: "Registrar contato",
      onClick: () => router.push(`/clientes/${deal.leadId}`),
    };
  }

  async function handleCreateDeal(payload: {
    mode: "existing" | "new";
    leadId?: string;
    clientName: string;
    whatsapp?: string;
    email?: string;
    dealName?: string;
    value?: number;
    assigneeUserId?: string;
  }): Promise<void> {
    if (!currentOrganizationId) return;

    let leadId = payload.leadId;
    if (payload.mode === "new") {
      const whatsappDigits = (payload.whatsapp ?? "").replace(/\D/g, "");
      const created = await createLead(currentOrganizationId, {
        name: payload.clientName,
        whatsapp: whatsappDigits,
        email: payload.email,
      });
      leadId = created.id;
    }

    if (!leadId) {
      throw new Error("Lead inválido para criar negociação.");
    }

    const title = payload.dealName?.trim() || `Negociação - ${payload.clientName}`;
    await createDeal(currentOrganizationId, leadId, {
      title,
      value: payload.value,
      stage: "NEW",
      assignedUserId: payload.assigneeUserId,
    });

    await loadDeals();
    setHighlightDealId(leadId);
    window.setTimeout(() => setHighlightDealId((curr) => (curr === leadId ? null : curr)), 3500);
  }

  if (orgLoading || loading) {
    return <LoadingState compact label="Carregando negociações" />;
  }

  if (!currentOrganizationId) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Selecione uma organização para ver negociações.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {}
      <CreateDealModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clientOptions}
        assignees={assignees}
        onCreateDeal={handleCreateDeal}
      />
      <CloseDealModal
        open={closeModalOpen}
        deal={closeModalDeal}
        fromStage={closeModalFromStage}
        fromStatus={closeModalFromStatus}
        status={closeModalStatus}
        onClose={handleCloseDealModalCancel}
        onConfirm={handleCloseDealModalConfirm}
      />
      <DealDetailDialog
        open={detailDealId !== null}
        deal={deals.find((d) => d.id === detailDealId) ?? null}
        organizationId={currentOrganizationId}
        assignees={assignees}
        onClose={() => setDetailDealId(null)}
        onSaved={(patch) => {
          setDeals((prev) =>
            prev.map((d) => (d.id === detailDealId ? { ...d, ...patch, recentAt: new Date() } : d))
          );
        }}
        onMarkLost={(deal) => {
          setDetailDealId(null);
          setCloseModalDeal(deal);
          setCloseModalStatus("lost");
          setCloseModalFromStage(deal.stage);
          setCloseModalOpen(true);
        }}
      />

      {}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">
            Operação · Negociações
          </p>
          {activeView === "prioridades" ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                {(() => {
                  const h = new Date().getHours();
                  return h < 12 ? "Bom dia 👋" : h < 18 ? "Boa tarde 👋" : "Boa noite 👋";
                })()}
              </h1>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {summary.overdueDeals > 0
                  ? `${summary.overdueDeals} ações atrasadas`
                  : "Nenhuma ação atrasada"}
                {summary.stalledDeals > 0 && ` · ${summary.stalledDeals} paradas`}
                {" · vamos começar pela mais quente."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                Funil de negociações
              </h1>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {openDealsCount} oportunidades ativas · {formatCurrency(summary.totalInNegotiation)}{" "}
                em pipeline
                {summary.overdueDeals > 0 && ` · ${summary.overdueDeals} ações atrasadas`}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {}
          <div className="hidden items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 sm:inline-flex">
            {(
              [
                {
                  key: "kanban" as const,
                  label: "Kanban",
                  icon: (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="7" height="18" />
                      <rect x="14" y="3" width="7" height="10" />
                    </svg>
                  ),
                },
                {
                  key: "tabela" as const,
                  label: "Tabela",
                  icon: (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  ),
                },
                {
                  key: "prioridades" as const,
                  label: "Prioridades",
                  icon: (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M3 3h18M6 8h12M9 13h6M11 18h2" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeView === key
                    ? "bg-[var(--color-foreground)] font-semibold text-[var(--color-background)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          {}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mr-1.5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            + Nova negociação
          </Button>
        </div>
      </header>

      {}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {memberLoadError ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{memberLoadError}</p>
      ) : null}

      {}
      {activeView !== "prioridades" && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                key: "all",
                label: `Todas (${openDealsCount})`,
                dot: "var(--color-muted-foreground)",
              },
              { key: "overdue", label: `Atrasadas (${summary.overdueDeals})`, dot: "#DC2626" },
              {
                key: "noProposal",
                label: `Sem proposta (${summary.noProposalDeals})`,
                dot: "#D97706",
              },
            ] as const
          ).map(({ key, label, dot }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                activeFilter === key
                  ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-foreground)]/40"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: activeFilter === key ? "currentColor" : dot }}
              />
              {label}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/30"
          >
            + Adicionar filtro
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Ordenar: urgência ▾
            </button>
            {activeView === "kanban" && (
              <button
                type="button"
                className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                Agrupar: estágio ▾
              </button>
            )}
            {activeView === "tabela" && (
              <button
                type="button"
                className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                Salvar visão
              </button>
            )}
          </div>
        </div>
      )}

      {}
      {activeView === "prioridades" && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "mine", label: `Minhas (${openDealsCount})` },
              { key: "team", label: "Do time (0)" },
              { key: "all", label: `Todas (${openDealsCount})` },
            ] as const
          ).map(({ key, label }, i) => (
            <button
              key={key}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                i === 0
                  ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-foreground)]/40"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              type="button"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Ordenar: impacto × urgência ▾
            </button>
          </div>
        </div>
      )}

      {}
      {activeView === "kanban" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          {}
          <div
            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 ${
              summary.overdueDeals > 0
                ? "border-red-200 from-red-50 to-white dark:border-red-900 dark:from-red-950/30 dark:to-[var(--color-card)]"
                : "border-emerald-200 from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/30 dark:to-[var(--color-card)]"
            }`}
          >
            <p
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                summary.overdueDeals > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {summary.overdueDeals > 0 ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {summary.overdueDeals > 0 ? "Ação prioritária" : "Pipeline em dia"}
            </p>
            <p
              className={`mt-1 flex items-baseline gap-2 text-[28px] font-bold tracking-tight ${
                summary.overdueDeals > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {summary.overdueDeals}
              <small className="text-sm font-medium text-[var(--color-muted-foreground)]">
                negociações atrasadas
              </small>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {summary.noProposalDeals > 0
                ? `${summary.noProposalDeals} oportunidade(s) ainda sem proposta enviada.`
                : "Nenhuma oportunidade pendente de proposta."}
              {summary.stalledDeals > 0 && ` · ${summary.stalledDeals} sem atividade recente.`}
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter(summary.overdueDeals > 0 ? "overdue" : "all")}
              className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                summary.overdueDeals > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {summary.overdueDeals > 0 ? "Ver prioridades →" : "Acompanhar pipeline →"}
            </button>
          </div>
          {}
          <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Pipeline ativo
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-[22px] font-bold tracking-tight text-[var(--color-foreground)]">
              {formatCurrency(summary.totalInNegotiation)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {openDealsCount} negociações · ticket médio{" "}
              {formatCurrency(openDealsCount > 0 ? summary.totalInNegotiation / openDealsCount : 0)}
            </p>
            <svg
              className="absolute bottom-3 right-3 opacity-70"
              width="80"
              height="26"
              viewBox="0 0 80 26"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                points="0,20 12,15 24,18 36,10 48,12 60,6 72,8 80,3"
              />
            </svg>
          </div>
          {}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Conversão Proposta → Fechado
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-[22px] font-bold tracking-tight text-[var(--color-foreground)]">
              —
              <small className="text-xs font-medium text-[var(--color-muted-foreground)]">
                sem fechamentos em 30d
              </small>
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Mediana do setor: 34%. Precisa de mais dados para tendência.
            </p>
          </div>
        </div>
      )}

      {}
      {activeView === "tabela" && (
        <PipelineTableView deals={deals} onOpenDeal={(deal) => setDetailDealId(deal.id)} />
      )}

      {}
      {activeView === "prioridades" && (
        <PipelinePrioridadesView
          deals={deals}
          onOpenProposal={(deal) => {
            void openStudyForDeal(deal);
          }}
          onFollowUp={(deal) => openWhatsapp(deal)}
          onAdvance={(deal) => {
            const nextStage = getAdvanceStage(deal.stage);
            if (nextStage) void moveDeal(deal.id, nextStage);
          }}
          onOpenContact={(deal) => setDetailDealId(deal.id)}
        />
      )}

      {}
      {activeView === "kanban" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          {}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Funil por estágio
            </span>
            <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:block">
              · arraste cards para avançar · clique para abrir detalhes
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/30"
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Colunas
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/30"
              >
                Densidade ▾
              </button>
            </div>
          </div>
          <div className="p-3">
            <KanbanBoard
              stages={STAGE_ORDER}
              items={deals}
              onItemsChange={replaceDeals}
              onDropCommit={commitDnDDrop}
              closedCollapsed={!fechadoExpanded}
              onExpandClosed={() => setFechadoExpanded(true)}
              renderColumnHeader={(stage, count) => {
                const stageTotal = stageValues[stage] ?? 0;
                if (stage === "fechado") {
                  return (
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">
                          {STAGE_LABEL[stage]}
                        </span>
                        <span className="min-w-[20px] rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 text-center text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                          {count}
                        </span>
                      </div>
                      {fechadoExpanded && (
                        <button
                          type="button"
                          onClick={() => setFechadoExpanded(false)}
                          className="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        >
                          ‹ Recolher
                        </button>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="pb-3">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span className="text-sm font-semibold text-[var(--color-foreground)]">
                        {STAGE_LABEL[stage]}
                      </span>
                      <span className="min-w-[20px] rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 text-center text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                        {count}
                      </span>
                      <span className="ml-auto text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                        {formatCurrency(stageTotal)}
                      </span>
                      <button
                        type="button"
                        className="ml-0.5 text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      >
                        ···
                      </button>
                    </div>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className={`h-full rounded-full ${STAGE_BAR_COLOR[stage]}`}
                        style={{ width: STAGE_BAR_WIDTH[stage] }}
                      />
                    </div>
                  </div>
                );
              }}
              renderEmptyColumn={() => (
                <div className="rounded-[10px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)]/50 px-3 py-4 text-center">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Arraste ou crie aqui
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    Nenhuma negociação neste estágio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
                  >
                    + Nova negociação
                  </button>
                </div>
              )}
              renderEmptyClosedRow={(status) => (
                <div className="rounded-md border border-dashed border-[var(--color-border)] p-2 text-xs text-[var(--color-muted-foreground)]">
                  Nenhuma em{" "}
                  {status === "won"
                    ? "ganho"
                    : status === "lost"
                      ? "perdido"
                      : status === "disqualified"
                        ? "desqualificado"
                        : status === "postponed"
                          ? "adiado"
                          : "cancelado"}
                  .
                </div>
              )}
              renderItem={(deal) => {
                const overdue = isOverdue(deal.nextStepDate);
                const stalledDays = daysSince(deal.recentAt);
                const isStale = !overdue && stalledDays >= STALLED_DAYS_THRESHOLD;
                const nextStage = getAdvanceStage(deal.stage);
                const nextBestAction = resolveNextBestAction(deal);

                const urgencyText = overdue
                  ? `vence ${formatNextActionCompact(deal.nextStepDate).toLowerCase()}`
                  : isStale
                    ? `parado ${stalledDays}d`
                    : null;
                const urgencyClass = overdue ? "text-red-600" : "text-amber-600";

                const valueQualifier = !deal.hasProposal
                  ? "/ proposta pendente"
                  : deal.proposalFollowUpStatus === "waiting"
                    ? "/ aguardando resposta"
                    : deal.proposalFollowUpStatus === "viewed"
                      ? "/ visto pelo cliente"
                      : null;

                const nextActionLabel = formatNextActionCompact(deal.nextStepDate);
                const isNextOverdue = isOverdue(deal.nextStepDate);
                const isNextSoon =
                  !isNextOverdue &&
                  deal.nextStepDate != null &&
                  deal.nextStepDate.getTime() - Date.now() <= 48 * 60 * 60 * 1000;
                const nextActionClass = isNextOverdue
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  : isNextSoon
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";

                const avatarInitials = deal.assigneeName
                  ? deal.assigneeName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("")
                  : "";

                const isHighlighted = highlightDealId === deal.id;

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailDealId(deal.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailDealId(deal.id);
                      }
                    }}
                    className={[
                      "cursor-pointer rounded-[10px] border bg-[var(--color-card)] px-3 py-2.5 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                      isHighlighted
                        ? "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : overdue
                          ? "border-[var(--color-border)] border-l-[3px] border-l-red-500 dark:border-l-red-600"
                          : isStale
                            ? "border-[var(--color-border)] border-l-[3px] border-l-amber-500 dark:border-l-amber-600"
                            : "border-[var(--color-border)]",
                    ].join(" ")}
                  >
                    {}
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        Energia Solar
                      </span>
                      {urgencyText && (
                        <span
                          className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold ${urgencyClass}`}
                        >
                          <span className="text-[8px]">●</span>
                          {urgencyText}
                        </span>
                      )}
                    </div>

                    {}
                    <h4 className="mt-1.5 text-[13px] font-semibold leading-tight text-[var(--color-foreground)]">
                      {deal.clientName}
                    </h4>

                    {}
                    <p className="mt-0.5 truncate text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                      {deal.contact}
                    </p>

                    {}
                    <p className="mt-1.5 text-[15px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]">
                      {formatCurrency(deal.value)}
                      {valueQualifier && (
                        <small className="ml-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                          {valueQualifier}
                        </small>
                      )}
                    </p>

                    {}
                    <div className="my-2 border-t border-dashed border-[var(--color-border)]" />

                    {}
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                      {avatarInitials && (
                        <>
                          <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 text-[9px] font-bold text-emerald-900">
                            {avatarInitials}
                          </div>
                          <span className="max-w-[72px] truncate">{deal.assigneeName}</span>
                          <span className="text-[var(--color-muted-foreground)]/40">·</span>
                        </>
                      )}
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${nextActionClass}`}
                      >
                        {isNextOverdue ? (
                          <Calendar className="h-2.5 w-2.5" />
                        ) : (
                          <Calendar className="h-2.5 w-2.5" />
                        )}
                        {nextActionLabel}
                      </span>
                    </div>

                    {}
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={nextBestAction.disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          nextBestAction.onClick();
                        }}
                        className="flex-1 rounded-[6px] bg-[var(--color-foreground)] px-2 py-1.5 text-center text-[11px] font-semibold text-[var(--color-background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {nextBestAction.label}
                      </button>
                      <IconButton
                        aria-label="Mais ações"
                        size="small"
                        className="!h-[28px] !w-[28px] !rounded-md !border !border-[var(--color-border)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionsMenu({ dealId: deal.id, anchorEl: e.currentTarget });
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </IconButton>
                      <Menu
                        anchorEl={actionsMenu?.anchorEl ?? null}
                        open={actionsMenu?.dealId === deal.id}
                        onClose={() => setActionsMenu(null)}
                      >
                        <MenuItem
                          disabled={!deal.dealId}
                          onClick={(e) => {
                            setActionsMenu(null);
                            setAssigneeMenu({ dealId: deal.id, anchorEl: e.currentTarget });
                          }}
                        >
                          Definir responsável
                        </MenuItem>
                        <MenuItem
                          disabled={!deal.whatsapp}
                          onClick={() => {
                            openWhatsapp(deal);
                            setActionsMenu(null);
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            router.push(`/clientes/${deal.leadId}`);
                            setActionsMenu(null);
                          }}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Registrar contato
                        </MenuItem>
                        {deal.latestProposalId ? (
                          <MenuItem
                            onClick={() => {
                              router.push(`/propostas/${deal.latestProposalId}`);
                              setActionsMenu(null);
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Abrir proposta
                          </MenuItem>
                        ) : null}
                        <MenuItem
                          disabled={!nextStage || updatingDealId === deal.id}
                          onClick={() => {
                            if (!nextStage) return;
                            void moveDeal(deal.id, nextStage);
                            setActionsMenu(null);
                          }}
                        >
                          Avançar estágio
                        </MenuItem>
                      </Menu>
                      <Menu
                        anchorEl={assigneeMenu?.anchorEl ?? null}
                        open={assigneeMenu?.dealId === deal.id}
                        onClose={() => setAssigneeMenu(null)}
                      >
                        <MenuItem
                          onClick={() => {
                            void assignDeal(deal, null);
                            setAssigneeMenu(null);
                            setActionsMenu(null);
                          }}
                        >
                          Sem responsável
                        </MenuItem>
                        {assignees.map((assignee) => (
                          <MenuItem
                            key={assignee.userId}
                            selected={deal.assigneeUserId === assignee.userId}
                            onClick={() => {
                              void assignDeal(deal, assignee.userId);
                              setAssigneeMenu(null);
                              setActionsMenu(null);
                            }}
                          >
                            {assignee.name}
                          </MenuItem>
                        ))}
                      </Menu>
                    </div>

                    {}
                    {(updatingDealId === deal.id || !deal.dealId) && (
                      <div className="mt-1">
                        {updatingDealId === deal.id && (
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">
                            Salvando estágio...
                          </span>
                        )}
                        {!deal.dealId && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300">
                            Sem oportunidade ativa para sincronizar estágio.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
