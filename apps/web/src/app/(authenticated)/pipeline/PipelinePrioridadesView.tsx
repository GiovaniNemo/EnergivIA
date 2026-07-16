"use client";

import { useMemo, useEffect, useState } from "react";
import type { Deal, DealStage } from "./use-deals";
import { useOrganization } from "@/components/providers/organization-provider";

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
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-2xl dark:border-violet-800 dark:bg-[var(--color-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-4">
          <span className="text-lg">✨</span>
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

        {}
        <div className="border-b border-[var(--color-border)] bg-violet-50/60 px-5 py-3 dark:bg-violet-950/20">
          <p className="text-[13px] font-medium text-[var(--color-foreground)]">{focus.summary}</p>
        </div>

        {}
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

        {}
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

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getAvatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColorClass(name: string): string {
  const palettes = [
    "from-yellow-200 to-yellow-400 text-yellow-900",
    "from-blue-200 to-blue-400 text-blue-900",
    "from-emerald-200 to-emerald-400 text-emerald-900",
    "from-violet-200 to-violet-400 text-violet-900",
    "from-red-200 to-red-400 text-red-900",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(hash) % palettes.length]!;
}

function resolveActionSentence(deal: Deal): { strong: string; detail: string } {
  if (!deal.hasProposal) {
    return {
      strong: "Criar proposta.",
      detail: "Cliente qualificado e aguardando envio.",
    };
  }
  if (deal.proposalFollowUpStatus === "viewed") {
    return {
      strong: "Responder cliente.",
      detail: "Proposta foi visualizada — janela quente, ideal para fechar.",
    };
  }
  if (deal.proposalFollowUpStatus === "waiting" || deal.proposalFollowUpStatus === "sent") {
    const days = daysSince(deal.recentAt);
    return {
      strong: "Enviar follow-up.",
      detail: `Proposta sem resposta há ${days} dia${days !== 1 ? "s" : ""}.`,
    };
  }
  const daysStale = daysSince(deal.recentAt);
  if (daysStale >= STALLED_DAYS_THRESHOLD) {
    return {
      strong: "Retomar contato.",
      detail: `Sem atualização há ${daysStale} dias.`,
    };
  }
  return {
    strong: `Avançar negociação.`,
    detail: `Próxima etapa: ${STAGE_LABEL[deal.stage]}.`,
  };
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

interface PriorityItemProps {
  deal: Deal;
  onOpenProposal: (deal: Deal) => void;
  onFollowUp: (deal: Deal) => void;
  onAdvance: (deal: Deal) => void;
  onOpenContact: (deal: Deal) => void;
}

function PriorityItem({
  deal,
  onOpenProposal,
  onFollowUp,
  onAdvance,
  onOpenContact,
}: PriorityItemProps) {
  const overdue = isOverdue(deal.nextStepDate);
  const hoursLate = deal.nextStepDate ? hoursSince(deal.nextStepDate) : 0;
  const daysStale = daysSince(deal.recentAt);
  const { strong, detail } = resolveActionSentence(deal);
  const avatarInitials = getAvatarInitials(deal.clientName);
  const avatarColor = getAvatarColorClass(deal.clientName);

  function primaryLabel(): string {
    if (!deal.hasProposal) return "Criar proposta →";
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
      className="grid cursor-pointer grid-cols-[40px_1fr_180px] items-center gap-3.5 border-b border-[var(--color-border)] px-4 py-3.5 outline-none transition-colors last:border-b-0 hover:bg-[var(--color-muted)]/20 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      {}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br text-[13px] font-bold ${avatarColor}`}
      >
        {avatarInitials}
      </div>

      {}
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

      {}
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handlePrimary}
          className="flex items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
        >
          {primaryLabel()}
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
          >
            Adiar
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
          >
            Delegar
          </button>
        </div>
      </div>
    </div>
  );
}

export interface PrioridadesViewProps {
  deals: Deal[];
  onOpenProposal: (deal: Deal) => void;
  onFollowUp: (deal: Deal) => void;
  onAdvance: (deal: Deal) => void;
  onOpenContact: (deal: Deal) => void;
}

export function PipelinePrioridadesView({
  deals,
  onOpenProposal,
  onFollowUp,
  onAdvance,
  onOpenContact,
}: PrioridadesViewProps) {
  const { currentOrganizationId } = useOrganization();
  const [focus, setFocus] = useState<FocusSuggestion | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

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

  const itemCallbacks = { onOpenProposal, onFollowUp, onAdvance, onOpenContact };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_308px]">
        {}
        <div className="flex flex-col gap-3">
          {}
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

          {}
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

          {}
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

        {}
        <aside className="flex flex-col gap-3">
          {}
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
                  className="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50/60 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-400 dark:hover:bg-violet-950/40"
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

          {}
          {(focus?.pattern ??
            (stalledDeals.length >= 2
              ? `${stalledDeals.length} negociações paradas sem resposta. Considere follow-up automático aos 3 dias.`
              : null)) && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3 text-violet-600"
                  aria-hidden="true"
                >
                  <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                </svg>
                Padrão detectado
              </div>
              <p className="text-[12px] leading-snug text-[var(--color-muted-foreground)]">
                {focus?.pattern ??
                  `${stalledDeals.length} negociações paradas sem resposta. Considere follow-up automático aos 3 dias.`}
              </p>
              <button
                type="button"
                className="mt-2 border-0 bg-transparent p-0 text-[11px] font-semibold text-violet-600 hover:underline"
              >
                Criar automação →
              </button>
            </div>
          )}

          {}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3 w-3 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Respostas rápidas
            </div>
            <ul className="flex flex-col gap-1.5">
              {[
                "📋 Follow-up proposta sem resposta (3d)",
                "📋 Confirmar reunião",
                "📋 Proposta com desconto por prazo",
                "📋 Recusar educadamente",
              ].map((tpl) => (
                <li
                  key={tpl}
                  className="cursor-pointer rounded-md bg-[var(--color-muted)] px-2.5 py-1.5 text-[12px] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
                >
                  {tpl}
                </li>
              ))}
            </ul>
          </div>

          {}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3 w-3 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Histórico do dia
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

      {reasoningOpen && focus && (
        <ReasoningModal focus={focus} deals={openDeals} onClose={() => setReasoningOpen(false)} />
      )}
    </>
  );
}
