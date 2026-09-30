"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import type { Deal, DealStage } from "./use-deals";
import { useOrganization } from "@/components/providers/organization-provider";
import { Check, Clock, Copy, MessageSquare, Sparkles, X, Zap } from "lucide-react";

interface FocusPriority {
  dealId: string;
  rank: number;
  reason: string;
  why?: string;
}

interface FocusSuggestion {
  summary: string;
  priorities: FocusPriority[];
  pattern: string | null;
}

function ReasoningModal({
  focus,
  deals,
  onClose,
}: {
  focus: FocusSuggestion;
  deals: Deal[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-2xl dark:border-violet-800 dark:bg-[var(--color-card)] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-4">
          <Sparkles className="h-5 w-5 text-white" />
          <div>
            <p className="text-[13px] font-bold text-white">Raciocínio da IA</p>
            <p className="text-[11px] text-violet-200">Por que priorizei essas negociações</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-[var(--color-border)] bg-violet-50/60 px-5 py-3 dark:bg-violet-950/20">
          <p className="text-[13px] font-medium text-[var(--color-foreground)]">{focus.summary}</p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {focus.priorities.map((p) => {
            const deal = deals.find((d) => d.id === p.dealId || d.dealId === p.dealId);
            return (
              <div
                key={p.dealId}
                className="flex gap-3.5 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0"
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                  {p.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                    {deal?.clientName ?? p.dealId}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-violet-600 dark:text-violet-400">
                    {p.reason}
                  </p>
                  {p.why && (
                    <p className="mt-1.5 rounded-lg bg-violet-50 px-3 py-2 text-[12px] leading-relaxed text-[var(--color-foreground)]/80 dark:bg-violet-950/30">
                      {p.why}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {focus.pattern && (
          <div className="border-t border-violet-100 bg-violet-50/60 px-5 py-3 dark:border-violet-900 dark:bg-violet-950/20">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Padrão detectado
            </p>
            <p className="text-[12px] leading-relaxed text-[var(--color-foreground)]/80">
              {focus.pattern}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickReply {
  id: string;
  title: string;
  text: string;
}

const QUICK_REPLIES: QuickReply[] = [
  {
    id: "qr-1",
    title: "Follow-up proposta sem resposta (3d)",
    text: "Olá! Tudo bem? Passando para saber se você conseguiu analisar a proposta do seu sistema solar fotovoltaico que te enviei. Ficou alguma dúvida técnica ou sobre o retorno do investimento?",
  },
  {
    id: "qr-2",
    title: "Confirmar reunião",
    text: "Olá! Confirmando nosso alinhamento agendado para conversar sobre os detalhes do seu projeto de energia solar. Prefere via chamada online no Google Meet ou por telefone?",
  },
  {
    id: "qr-3",
    title: "Proposta com desconto por prazo",
    text: "Olá! Conseguimos uma condição diferenciada junto ao nosso distribuidor com desconto exclusivo para faturamento neste lote. Essa oportunidade é válida até sexta-feira, podemos avançar?",
  },
  {
    id: "qr-4",
    title: "Recusar educadamente",
    text: "Olá! Compreendo sua decisão neste momento. Vou manter o seu estudo salvo em nosso histórico e ficamos à disposição caso decida retomar a economia solar no futuro!",
  },
];

async function fetchFocusSuggestion(orgId: string, deals: Deal[]): Promise<FocusSuggestion> {
  const now = Date.now();
  const payload = deals.map((d) => {
    const overdue = d.nextStepDate ? d.nextStepDate.getTime() < now : false;
    const hoursOverdue =
      overdue && d.nextStepDate
        ? Math.max(0, Math.floor((now - d.nextStepDate.getTime()) / (1000 * 60 * 60)))
        : 0;
    const daysSinceUpdate = Math.max(
      0,
      Math.floor((now - d.recentAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      id: d.id,
      clientName: d.clientName,
      stage: d.stage,
      value: d.value,
      isOverdue: overdue,
      hoursOverdue,
      daysSinceUpdate,
      proposalStatus: d.proposalFollowUpStatus ?? "none",
    };
  });

  const res = await fetch("/api/proxy/deals/focus-suggestion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-organization-id": orgId,
    },
    body: JSON.stringify({ deals: payload }),
  });
  if (!res.ok) throw new Error("focus-suggestion failed");
  return res.json() as Promise<FocusSuggestion>;
}

const STAGE_LABEL: Record<DealStage, string> = {
  novo: "Novo",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
};

const STALLED_DAYS_THRESHOLD = 3;

function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  return date.getTime() < Date.now();
}

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function hoursSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function stagePillClass(stage: DealStage): string {
  switch (stage) {
    case "novo":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "contato":
      return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
    case "proposta":
      return "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400";
    case "negociacao":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "fechado":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

function resolveActionSentence(deal: Deal): { strong: string; detail: string } {
  if (deal.stage === "novo") {
    return {
      strong: "Qualificar lead.",
      detail: "Entrar em contato para levantar histórico de consumo e concessionária.",
    };
  }
  if (!deal.hasProposal) {
    return {
      strong: "Criar proposta.",
      detail: "Cliente qualificado e aguardando envio do dimensionamento.",
    };
  }
  if (deal.proposalFollowUpStatus === "viewed") {
    return {
      strong: "Responder cliente.",
      detail: "Proposta foi visualizada — janela quente, ideal para fechar.",
    };
  }
  if (deal.proposalFollowUpStatus === "waiting") {
    return {
      strong: "Fazer follow-up.",
      detail: "Proposta enviada sem retorno recente. Retome o contato.",
    };
  }
  return {
    strong: "Acompanhar negociação.",
    detail: "Negociação em andamento, verifique próximos passos.",
  };
}

function getAvatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColorClass(name: string): string {
  const colors = [
    "from-emerald-200 to-emerald-400 text-emerald-900",
    "from-blue-200 to-blue-400 text-blue-900",
    "from-violet-200 to-violet-400 text-violet-900",
    "from-amber-200 to-amber-400 text-amber-900",
    "from-rose-200 to-rose-400 text-rose-900",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length]!;
}

interface PriorityItemProps {
  deal: Deal;
  isProposalCreationLocked: boolean;
  assignees?: Array<{ userId: string; name: string; subtitle?: string }>;
  onOpenProposal: (deal: Deal) => void;
  onFollowUp: (deal: Deal) => void;
  onAdvance: (deal: Deal) => void;
  onOpenContact: (deal: Deal) => void;
  onPostpone?: (deal: Deal, days: number) => Promise<void>;
  onAssign?: (deal: Deal, userId: string | null) => Promise<void>;
}

function PriorityItem({
  deal,
  isProposalCreationLocked,
  assignees = [],
  onOpenProposal,
  onFollowUp,
  onAdvance,
  onOpenContact,
  onPostpone,
  onAssign,
}: PriorityItemProps) {
  const overdue = isOverdue(deal.nextStepDate);
  const hoursLate = deal.nextStepDate ? hoursSince(deal.nextStepDate) : 0;
  const daysStale = daysSince(deal.recentAt);
  const { strong, detail } = resolveActionSentence(deal);
  const avatarInitials = getAvatarInitials(deal.clientName);
  const avatarColor = getAvatarColorClass(deal.clientName);

  const [postponeOpen, setPostponeOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const postponeRef = useRef<HTMLDivElement>(null);
  const delegateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (postponeRef.current && !postponeRef.current.contains(target)) setPostponeOpen(false);
      if (delegateRef.current && !delegateRef.current.contains(target)) setDelegateOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function primaryLabel(): string {
    if (!deal.hasProposal) {
      return isProposalCreationLocked ? "🔒 Criar proposta (Plano Expirado)" : "Criar proposta →";
    }
    if (
      deal.proposalFollowUpStatus === "viewed" ||
      deal.proposalFollowUpStatus === "waiting" ||
      deal.proposalFollowUpStatus === "sent"
    )
      return "Enviar follow-up →";
    if (deal.stage === "negociacao") return "Marcar como Ganho ✓";
    return "Registrar contato →";
  }

  function handlePrimary(): void {
    if (!deal.hasProposal) {
      onOpenProposal(deal);
    } else if (
      deal.proposalFollowUpStatus === "viewed" ||
      deal.proposalFollowUpStatus === "waiting" ||
      deal.proposalFollowUpStatus === "sent"
    ) {
      onFollowUp(deal);
    } else if (deal.stage === "negociacao") {
      onAdvance(deal);
    } else {
      onOpenContact(deal);
    }
  }

  const handlePostpone = async (days: number) => {
    if (!onPostpone) return;
    setBusy(true);
    try {
      await onPostpone(deal, days);
      setPostponeOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (userId: string | null) => {
    if (!onAssign) return;
    setBusy(true);
    try {
      await onAssign(deal, userId);
      setDelegateOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenContact(deal)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenContact(deal);
        }
      }}
      className="grid cursor-pointer grid-cols-[40px_1fr_190px] items-center gap-3.5 border-b border-[var(--color-border)] px-4 py-3.5 outline-none transition-colors last:border-b-0 hover:bg-[var(--color-muted)]/20 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br text-[13px] font-bold ${avatarColor}`}
      >
        {avatarInitials}
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stagePillClass(deal.stage)}`}
          >
            {STAGE_LABEL[deal.stage]}
          </span>
          {overdue ? (
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
              {hoursLate >= 24
                ? `atrasado há ${Math.floor(hoursLate / 24)} dia${Math.floor(hoursLate / 24) !== 1 ? "s" : ""}`
                : `atrasado há ${hoursLate}h`}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              parado há {daysStale} dia{daysStale !== 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto text-[13px] font-bold text-[var(--color-foreground)]">
            {formatCurrency(deal.value)}
          </span>
        </div>
        <p className="text-[14px] font-semibold leading-snug text-[var(--color-foreground)]">
          {deal.clientName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
          {deal.contact}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--color-foreground)]/80">
          <strong className="text-[var(--color-foreground)]">{strong}</strong> {detail}
        </p>
      </div>

      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handlePrimary}
          className="flex items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {primaryLabel()}
        </button>
        <div className="flex gap-1 relative">
          {/* Adiar Menu */}
          <div ref={postponeRef} className="flex-1 relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPostponeOpen((v) => !v);
                setDelegateOpen(false);
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              {busy ? "..." : "Adiar"}
            </button>

            {postponeOpen && (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Adiar para:
                </div>
                {[
                  { label: "Amanhã (+1d)", days: 1 },
                  { label: "Em 3 dias", days: 3 },
                  { label: "Em 1 semana (+7d)", days: 7 },
                  { label: "Em 2 semanas (+14d)", days: 14 },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => handlePostpone(opt.days)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                  >
                    <span>{opt.label}</span>
                    <Clock className="h-3 w-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delegar Menu */}
          <div ref={delegateRef} className="flex-1 relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDelegateOpen((v) => !v);
                setPostponeOpen(false);
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              {busy ? "..." : "Delegar"}
            </button>

            {delegateOpen && (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Atribuir a:
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                >
                  <span className="h-4 w-4 rounded-full border border-dashed border-[var(--color-border)] flex items-center justify-center text-[9px]">
                    —
                  </span>
                  <span>Sem responsável</span>
                </button>
                <div className="my-1 border-t border-[var(--color-border)]" />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {assignees.map((mem) => {
                    const initials = mem.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("");
                    return (
                      <button
                        key={mem.userId}
                        type="button"
                        onClick={() => handleAssign(mem.userId)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[9px]">
                          {initials}
                        </span>
                        <span className="truncate">{mem.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PrioridadesViewProps {
  deals: Deal[];
  assignees?: Array<{ userId: string; name: string; subtitle?: string }>;
  onOpenProposal: (deal: Deal) => void;
  onFollowUp: (deal: Deal) => void;
  onAdvance: (deal: Deal) => void;
  onOpenContact: (deal: Deal) => void;
  onPostpone?: (deal: Deal, days: number) => Promise<void>;
  onAssign?: (deal: Deal, userId: string | null) => Promise<void>;
}

export function PipelinePrioridadesView({
  deals,
  assignees = [],
  onOpenProposal,
  onFollowUp,
  onAdvance,
  onOpenContact,
  onPostpone,
  onAssign,
}: PrioridadesViewProps) {
  const { currentOrganizationId, user } = useOrganization();
  const [focus, setFocus] = useState<FocusSuggestion | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  // Automation Modal & Quick Reply Modal states
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [quickReplyModal, setQuickReplyModal] = useState<QuickReply | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [automationSuccess, setAutomationSuccess] = useState(false);

  const isTrial = user?.isTrial ?? false;
  const isTrialExpired = Boolean(isTrial && user?.trialExpired);
  const isTrialLimitReached = Boolean(isTrial && user?.isTrialProposalLimitReached);
  const isPlanLimitReached = Boolean(!isTrial && user?.isProposalLimitReached);
  const isProposalCreationLocked = Boolean(
    isTrialExpired || isTrialLimitReached || isPlanLimitReached || user?.isTrialLocked
  );

  const openDeals = useMemo(() => deals.filter((d) => d.stage !== "fechado"), [deals]);

  const overdueDeals = useMemo(
    () =>
      openDeals
        .filter((d) => isOverdue(d.nextStepDate))
        .sort((a, b) => (a.nextStepDate?.getTime() ?? 0) - (b.nextStepDate?.getTime() ?? 0)),
    [openDeals]
  );

  const stalledDeals = useMemo(
    () =>
      openDeals.filter(
        (d) => !isOverdue(d.nextStepDate) && daysSince(d.recentAt) >= STALLED_DAYS_THRESHOLD
      ),
    [openDeals]
  );

  const upcomingDeals = useMemo(
    () =>
      openDeals.filter(
        (d) => !isOverdue(d.nextStepDate) && daysSince(d.recentAt) < STALLED_DAYS_THRESHOLD
      ),
    [openDeals]
  );

  const overdueTotal = overdueDeals.reduce((s, d) => s + d.value, 0);
  const stalledTotal = stalledDeals.reduce((s, d) => s + d.value, 0);

  useEffect(() => {
    if (!currentOrganizationId || openDeals.length === 0) return;
    let cancelled = false;
    setFocusLoading(true);
    fetchFocusSuggestion(currentOrganizationId, openDeals)
      .then((result) => {
        if (!cancelled) setFocus(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFocusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId, openDeals]);

  const itemCallbacks = {
    isProposalCreationLocked,
    assignees,
    onOpenProposal,
    onFollowUp,
    onAdvance,
    onOpenContact,
    onPostpone,
    onAssign,
  };

  const handleCopyQuickReply = (qr: QuickReply) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(qr.text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2400);
    }
    setQuickReplyModal(qr);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_308px]">
        <div className="flex flex-col gap-3">
          {/* 1. Agora — atrasadas */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              <span>⚠</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Agora — atrasadas
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950">
                {overdueDeals.length}
              </span>
              <span className="ml-auto text-xs font-semibold">{formatCurrency(overdueTotal)}</span>
            </div>
            {overdueDeals.length > 0 ? (
              overdueDeals.map((deal) => (
                <PriorityItem key={deal.id} deal={deal} {...itemCallbacks} />
              ))
            ) : (
              <div className="px-4 py-5 text-center text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Nenhuma ação atrasada. Ótimo trabalho!
              </div>
            )}
          </div>

          {/* 2. Parado — sem atualização há 3+ dias */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
              <span>⏳</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Parado — sem atualização há 3+ dias
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950">
                {stalledDeals.length}
              </span>
              <span className="ml-auto text-xs font-semibold">{formatCurrency(stalledTotal)}</span>
            </div>
            {stalledDeals.length > 0 ? (
              stalledDeals.map((deal) => (
                <PriorityItem key={deal.id} deal={deal} {...itemCallbacks} />
              ))
            ) : (
              <div className="px-4 py-5 text-center text-[13px] font-medium text-[var(--color-muted-foreground)]">
                Nenhuma negociação parada.
              </div>
            )}
          </div>

          {/* 3. Esta semana */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5 text-[var(--color-muted-foreground)]">
              <span>📅</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Esta semana</span>
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-muted-foreground)]">
                {upcomingDeals.length}
              </span>
            </div>
            {upcomingDeals.length > 0 ? (
              upcomingDeals.map((deal) => (
                <PriorityItem key={deal.id} deal={deal} {...itemCallbacks} />
              ))
            ) : (
              <div className="px-4 py-5 text-center text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Tudo em dia por aqui. Nenhuma ação pendente.
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="flex flex-col gap-3">
          {/* Card: IA Seu foco do dia */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3.5 dark:border-violet-900 dark:from-violet-950/20 dark:to-[var(--color-card)]">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-violet-600 to-purple-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                ✨ IA
              </span>
              <span className="text-[13px] font-bold text-[var(--color-foreground)]">
                Seu foco do dia
              </span>
              {focusLoading && (
                <span className="ml-auto text-[11px] text-[var(--color-muted-foreground)] animate-pulse">
                  analisando…
                </span>
              )}
            </div>

            {focusLoading && !focus ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="grid grid-cols-[20px_1fr] gap-2">
                    <div className="mt-0.5 h-[18px] w-[18px] animate-pulse rounded-full bg-violet-200" />
                    <div className="flex flex-col gap-1">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-violet-100" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-violet-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : focus ? (
              <>
                <p className="mb-3 text-[12px] leading-snug text-[var(--color-foreground)]/80">
                  {focus.summary}
                </p>
                <ol className="flex flex-col gap-3">
                  {focus.priorities.map((p) => {
                    const deal = openDeals.find((d) => d.id === p.dealId || d.dealId === p.dealId);
                    return (
                      <li
                        key={p.dealId}
                        className="grid grid-cols-[20px_1fr] gap-2 text-[12px] leading-snug"
                      >
                        <span className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                          {p.rank}
                        </span>
                        <div>
                          <strong className="block text-[var(--color-foreground)]">
                            {deal?.clientName ?? p.dealId}
                          </strong>
                          <span className="text-[11px] text-[var(--color-muted-foreground)]">
                            {p.reason}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <button
                  type="button"
                  onClick={() => setReasoningOpen(true)}
                  className="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50/60 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-400 dark:hover:bg-violet-950/40 transition-colors"
                >
                  Ver raciocínio →
                </button>
              </>
            ) : (
              <p className="text-[12px] text-[var(--color-muted-foreground)]">
                {openDeals.length === 0
                  ? "Nenhuma negociação aberta no momento."
                  : "Nenhuma ação urgente. Continue assim!"}
              </p>
            )}
          </div>

          {/* Card: Padrão detectado */}
          {(focus?.pattern ??
            (stalledDeals.length >= 2
              ? `${stalledDeals.length} negociações paradas sem resposta. Considere follow-up automático aos 3 dias.`
              : null)) && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 transition-all">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <span>Padrão detectado</span>
              </div>
              <p className="text-[12px] leading-snug text-[var(--color-muted-foreground)]">
                {focus?.pattern ??
                  `${stalledDeals.length} negociações paradas sem resposta. Considere follow-up automático aos 3 dias.`}
              </p>
              <button
                type="button"
                onClick={() => setAutomationModalOpen(true)}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline dark:text-violet-400 transition-colors"
              >
                <span>Criar automação →</span>
              </button>
            </div>
          )}

          {/* Card: Respostas rápidas */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5">
            <div className="mb-2.5 flex items-center justify-between text-[12px] font-semibold text-[var(--color-foreground)]">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span>Respostas rápidas</span>
              </span>
              <span className="text-[10px] text-[var(--color-muted-foreground)] font-normal">
                Clique para copiar
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {QUICK_REPLIES.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => handleCopyQuickReply(tpl)}
                    className="group flex w-full items-center justify-between rounded-lg bg-[var(--color-muted)]/70 px-2.5 py-2 text-[12px] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:border-[var(--color-border)] text-left"
                  >
                    <span className="truncate pr-2 font-medium">{tpl.title}</span>
                    <Copy className="h-3 w-3 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Card: Histórico do dia */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
              <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span>Histórico do dia</span>
            </div>
            <p className="text-[11px] leading-snug text-[var(--color-muted-foreground)]">
              Pipeline ativo:{" "}
              <strong className="text-[var(--color-foreground)]">
                {formatCurrency(openDeals.reduce((s, d) => s + d.value, 0))}
              </strong>{" "}
              · {openDeals.length} negociação{openDeals.length !== 1 ? "ções" : ""} em aberto.
            </p>
          </div>
        </aside>
      </div>

      {/* Toast de Cópia */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="h-4 w-4" />
          <span>Mensagem copiada para a área de transferência!</span>
        </div>
      )}

      {/* Quick Reply Modal Preview */}
      {quickReplyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setQuickReplyModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>{quickReplyModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setQuickReplyModal(null)}
                className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-4">
              <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-3.5 text-xs leading-relaxed text-[var(--color-foreground)]">
                {quickReplyModal.text}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(quickReplyModal.text);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2400);
                  setQuickReplyModal(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar Mensagem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automation Modal */}
      {automationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAutomationModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span>Automação de Follow-up Inteligente</span>
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Detectamos <strong>{stalledDeals.length} negociações</strong> paradas há mais de 3
                  dias sem resposta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutomationModalOpen(false)}
                className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 text-xs text-violet-900 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-200">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-violet-600" />
                  Como funciona esta automação:
                </p>
                <p className="leading-relaxed opacity-90">
                  Todas as negociações que estiverem sem contato há mais de 3 dias receberão um
                  lembrete prioritário e agendamento de follow-up automático com modelo de mensagem
                  para reativação.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                  Mensagem padrão de reativação:
                </label>
                <textarea
                  readOnly
                  rows={3}
                  defaultValue="Olá! Tudo bem? Passando para saber se você conseguiu analisar a proposta do seu sistema solar que te enviei. Ficou alguma dúvida sobre o payback ou os equipamentos?"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs text-[var(--color-foreground)] focus:outline-none"
                />
              </div>

              {automationSuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Automação aplicada com sucesso para as negociações paradas!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => setAutomationModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutomationSuccess(true);
                  setTimeout(() => {
                    setAutomationSuccess(false);
                    setAutomationModalOpen(false);
                  }, 1800);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-violet-500 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Executar Automação Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reasoning Modal */}
      {reasoningOpen && focus && (
        <ReasoningModal focus={focus} deals={openDeals} onClose={() => setReasoningOpen(false)} />
      )}
    </>
  );
}
