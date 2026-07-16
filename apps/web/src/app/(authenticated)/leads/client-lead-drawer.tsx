"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ExternalLink,
  FileText,
  Gauge,
  Mail,
  MessageCircle,
  Pencil,
  IdCard,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@energivia/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { LoadingState } from "@/components/ui/loading-state";
import {
  ACTIVITY_TONE_DOT_CLASS,
  ACTIVITY_TONE_TEXT_CLASS,
  formatNextStepSummary,
  lastActivityPresentation,
} from "@/lib/lead-activity";
import {
  formatProposalDatePt,
  proposalQuotedTotalBrl,
  proposalStatusLabel,
  proposalStatusPillClass,
  proposalSystemPowerKw,
  proposalSystemSizeKwFromSimulation,
} from "@/lib/proposal-card-meta";
import {
  getLead,
  listSimulationsForLead,
  simulationHasEmbeddedSizing,
  waMeUrl,
  type LeadDetail,
  type SimulationListItem,
} from "@/lib/leads-api";
import { formatCpfCnpjDigits, maskCpfCnpj, maskWhatsappBr } from "@energivia/utils";
import { DealStageBadge } from "./deal-stage-badge";
import { SetNextStepDialog } from "./set-next-step-dialog";
import {
  buildDealFromLeadDetail,
  useProposalStudy,
} from "@/components/pipeline/proposal-study-provider";
import { proposalStudyBridge } from "@/components/pipeline/proposal-study-bridge";

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  const first = p[0]?.[0] ?? "";
  const last = p[p.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

const contactIconWrap =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/12 text-[var(--color-primary)] dark:bg-[var(--color-primary)]/20 dark:text-[var(--color-primary-400)]";

const quickOutlineClass =
  "inline-flex h-10 w-full items-center justify-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-muted)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

const quickPrimaryClass =
  "inline-flex h-10 w-full items-center justify-start gap-2 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/12 px-3 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] dark:border-[var(--color-primary)]/35";

function monthlySavingsFromSimulation(result: unknown): number | null {
  if (!result || typeof result !== "object") return null;
  const m = (result as { monthlySavings?: unknown }).monthlySavings;
  return typeof m === "number" && Number.isFinite(m) ? m : null;
}

function sectionHeading(icon: ReactNode, label: string) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
      <span className="text-[var(--color-primary)] opacity-80" aria-hidden>
        {icon}
      </span>
      {label}
    </h3>
  );
}

export function ClientLeadDrawer({
  open,
  onOpenChange,
  organizationId,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  leadId: string | null;
}): JSX.Element | null {
  const { openStudyForDeal } = useProposalStudy();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [sims, setSims] = useState<SimulationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    if (!open || !organizationId || !leadId) {
      setLead(null);
      setSims([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getLead(organizationId, leadId),
      listSimulationsForLead(organizationId, leadId).catch(() => [] as SimulationListItem[]),
    ])
      .then(([data, simList]) => {
        setLead(data);
        setSims(simList);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar cliente"))
      .finally(() => setLoading(false));
  }, [open, organizationId, leadId]);

  const latestDeal = useMemo(() => {
    if (!lead?.deals?.length) return null;
    return [...lead.deals].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]!;
  }, [lead]);

  const hasStudyReady = useMemo(() => sims.some(simulationHasEmbeddedSizing), [sims]);

  const proposalsFlat = useMemo(() => {
    if (!lead) return [];
    const rows: {
      id: string;
      title: string;
      dealTitle: string;
      status: string;
      createdAt: string;
      validUntil: string;
      sentAt: string | null | undefined;
      renderedData: unknown | null | undefined;
      simulationInput: unknown | null | undefined;
      monthly: number | null;
    }[] = [];
    for (const d of lead.deals) {
      for (const p of d.proposals) {
        rows.push({
          id: p.id,
          title: p.title,
          dealTitle: d.title,
          status: p.status,
          createdAt: p.createdAt,
          validUntil: p.validUntil,
          sentAt: p.sentAt,
          renderedData: p.renderedData,
          simulationInput: p.simulation?.input,
          monthly: monthlySavingsFromSimulation(p.simulation?.result),
        });
      }
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lead]);

  const lastInteractionIso = useMemo(() => {
    if (!lead) return null;
    let max = new Date(lead.updatedAt).getTime();
    for (const d of lead.deals) {
      const t = new Date(d.updatedAt).getTime();
      if (t > max) max = t;
    }
    return new Date(max).toISOString();
  }, [lead]);

  const dealValueDisplay = useMemo(() => {
    if (!latestDeal?.value) return null;
    const n = Number(latestDeal.value);
    return Number.isFinite(n) ? formatBRL(n) : null;
  }, [latestDeal?.value]);

  async function reloadLead() {
    if (!organizationId || !leadId) return;
    const [fresh, simList] = await Promise.all([
      getLead(organizationId, leadId),
      listSimulationsForLead(organizationId, leadId).catch(() => [] as SimulationListItem[]),
    ]);
    setLead(fresh);
    setSims(simList);
  }

  useEffect(() => {
    if (!open || !lead) {
      proposalStudyBridge.setOnDrawerStudyComplete(null);
      return;
    }
    proposalStudyBridge.setOnDrawerStudyComplete(() => void reloadLead());
    return () => proposalStudyBridge.setOnDrawerStudyComplete(null);
  }, [open, lead?.id, organizationId, leadId]);

  if (!leadId) return null;

  const waHref = lead
    ? waMeUrl(lead.whatsapp, `Olá, ${lead.name.split(/\s+/)[0] ?? ""}! Tudo bem?`)
    : "#";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[440px]">
        {loading ? (
          <div className="px-5 py-8">
            <LoadingState label="Carregando cliente" compact />
          </div>
        ) : error ? (
          <div className="px-5 py-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : lead ? (
          <>
            <DrawerHeader className="space-y-4 border-b border-[var(--color-border)]/80 bg-gradient-to-b from-[var(--color-primary)]/[0.08] via-[var(--color-accent)]/25 to-[var(--color-card)] pb-5 pt-1">
              <div className="flex items-start gap-3 pr-2">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-sm font-bold tracking-tight text-[var(--color-primary-700)] dark:bg-[var(--color-primary)]/20 dark:text-[var(--color-primary-300)]"
                  aria-hidden
                >
                  {initials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="pr-8 text-xl font-semibold leading-snug tracking-tight text-[var(--color-foreground)]">
                    {lead.name}
                  </DrawerTitle>
                  {lead.company ? (
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {lead.company}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--color-muted)]/50"
                >
                  <span className={contactIconWrap}>
                    <MessageCircle className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      WhatsApp
                    </p>
                    <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                      {maskWhatsappBr(lead.whatsapp)}
                    </p>
                  </div>
                </a>
                {lead.email ? (
                  <a
                    href={`mailto:${encodeURIComponent(lead.email)}`}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--color-muted)]/50"
                  >
                    <span className={contactIconWrap}>
                      <Mail className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        E-mail
                      </p>
                      <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                        {lead.email}
                      </p>
                    </div>
                  </a>
                ) : null}
                {lead.cpfCnpj ? (
                  <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
                    <span className={contactIconWrap}>
                      <IdCard className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        CPF / CNPJ
                      </p>
                      <p className="font-mono text-sm text-[var(--color-foreground)]">
                        {maskCpfCnpj(formatCpfCnpjDigits(lead.cpfCnpj))}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </DrawerHeader>

            <div className="space-y-6 px-5 pb-6 pt-5">
              <section>
                {sectionHeading(<Activity className="h-3.5 w-3.5" />, "Situação")}
                <div className="space-y-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/[0.12] shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)]/60 px-4 py-3">
                    <span className="text-xs text-[var(--color-muted-foreground)]">Status</span>
                    <DealStageBadge stage={latestDeal?.stage ?? null} />
                  </div>
                  {dealValueDisplay ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)]/60 px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                        <Wallet className="h-3.5 w-3.5 opacity-70" aria-hidden />
                        Valor da oportunidade
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                        {dealValueDisplay}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-b border-[var(--color-border)]/60 px-4 py-3">
                    <p className="text-xs text-[var(--color-muted-foreground)]">Última interação</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {(() => {
                        const act = lastActivityPresentation(lastInteractionIso);
                        return (
                          <>
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${ACTIVITY_TONE_DOT_CLASS[act.tone]}`}
                              aria-hidden
                            />
                            <span className={`text-sm ${ACTIVITY_TONE_TEXT_CLASS[act.tone]}`}>
                              {act.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-[var(--color-muted-foreground)]">Próximo passo</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {latestDeal?.stage === "LOST" ? (
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {formatNextStepSummary(
                            latestDeal?.nextActionAt ?? null,
                            latestDeal?.nextActionType ?? null,
                            latestDeal?.stage ?? null
                          )}
                        </span>
                      ) : latestDeal?.nextActionAt ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm",
                            isOverdue(latestDeal.nextActionAt)
                              ? "font-medium text-amber-800 dark:text-amber-300"
                              : "text-[var(--color-foreground)]"
                          )}
                        >
                          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden />
                          {formatNextStepSummary(
                            latestDeal.nextActionAt,
                            latestDeal.nextActionType ?? null,
                            latestDeal.stage
                          )}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-dashed text-xs font-medium"
                          onClick={() => setScheduleOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Definir
                        </Button>
                      )}
                      {isOverdue(latestDeal?.nextActionAt ?? null) &&
                      latestDeal?.stage !== "LOST" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Atrasado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                {sectionHeading(<FileText className="h-3.5 w-3.5" />, "Propostas")}
                {proposalsFlat.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/10 px-4 py-9 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]/40 text-[var(--color-muted-foreground)]/50">
                      <FileText className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
                      Nenhuma proposta ainda
                    </p>
                    <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                      Gere um documento comercial para este cliente a partir da ficha ou use{" "}
                      <span className="font-medium text-[var(--color-foreground)]">
                        Nova proposta
                      </span>{" "}
                      abaixo.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {proposalsFlat.slice(0, 8).map((p) => {
                      const totalBrl = proposalQuotedTotalBrl(p.renderedData, p.simulationInput);
                      const kw =
                        proposalSystemPowerKw(p.renderedData) ??
                        proposalSystemSizeKwFromSimulation(p.simulationInput);
                      const sameTitle =
                        p.dealTitle.trim().toLowerCase() === p.title.trim().toLowerCase();
                      return (
                        <li
                          key={p.id}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm transition-shadow hover:border-[var(--color-primary)]/25 hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Link
                              href={`/propostas/${p.id}`}
                              className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-[var(--color-primary-700)] hover:underline dark:text-[var(--color-primary-400)]"
                            >
                              {p.title}
                            </Link>
                            <span
                              className={proposalStatusPillClass(p.status)}
                              title={proposalStatusLabel(p.status)}
                            >
                              {proposalStatusLabel(p.status)}
                            </span>
                          </div>
                          {!sameTitle ? (
                            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                              Oportunidade: {p.dealTitle}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
                            Criada em{" "}
                            <time dateTime={p.createdAt}>{formatProposalDatePt(p.createdAt)}</time>
                            {p.sentAt ? (
                              <>
                                {" · "}
                                Enviada em{" "}
                                <time dateTime={p.sentAt}>{formatProposalDatePt(p.sentAt)}</time>
                              </>
                            ) : null}
                          </p>
                          <dl className="mt-3 space-y-2 border-t border-[var(--color-border)]/70 pt-3 text-xs">
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-[var(--color-muted-foreground)]">Valor total</dt>
                              <dd className="text-right font-semibold tabular-nums text-[var(--color-foreground)]">
                                {totalBrl != null ? formatBRL(totalBrl) : "—"}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-[var(--color-muted-foreground)]">Válida até</dt>
                              <dd className="text-right font-medium tabular-nums text-[var(--color-foreground)]">
                                <time dateTime={p.validUntil}>
                                  {formatProposalDatePt(p.validUntil)}
                                </time>
                              </dd>
                            </div>
                            {kw != null ? (
                              <div className="flex items-baseline justify-between gap-3">
                                <dt className="text-[var(--color-muted-foreground)]">Potência</dt>
                                <dd className="text-right font-medium tabular-nums text-[var(--color-foreground)]">
                                  {kw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWp
                                </dd>
                              </div>
                            ) : null}
                            {p.monthly != null ? (
                              <div className="flex items-baseline justify-between gap-3">
                                <dt className="text-[var(--color-muted-foreground)]">
                                  Economia estimada
                                </dt>
                                <dd className="font-semibold tabular-nums text-[var(--color-foreground)]">
                                  {formatBRL(p.monthly)}/mês
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                {sectionHeading(<Sparkles className="h-3.5 w-3.5" />, "Ações rápidas")}
                <div className="grid gap-2">
                  {hasStudyReady ? (
                    <Link
                      href={`/clientes/${lead.id}?novaProposta=1`}
                      className={cn(quickPrimaryClass)}
                      title="Abre o fluxo de nova proposta na ficha do cliente."
                    >
                      <FileText className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
                      Nova proposta
                    </Link>
                  ) : (
                    <div className="space-y-1.5">
                      <div
                        className={cn(
                          quickPrimaryClass,
                          "pointer-events-none cursor-not-allowed opacity-[0.55]"
                        )}
                        title="É necessário uma simulação com consumo (dimensionamento) antes de criar a proposta."
                        aria-disabled
                      >
                        <FileText className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
                        Nova proposta
                      </div>
                      <p className="text-[11px] leading-snug text-[var(--color-muted-foreground)] px-0.5">
                        Não há simulações disponíveis com consumo para vincular à proposta. Use{" "}
                        <span className="font-medium text-[var(--color-foreground)]">
                          Simular sistema solar
                        </span>{" "}
                        para enviar a conta ou preencher manualmente (mesmo fluxo de Negociações).
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    className={cn(quickOutlineClass, "text-left")}
                    title="Abre o assistente de conta de luz ou modo manual, como em Negociações."
                    onClick={() => {
                      onOpenChange(false);
                      void openStudyForDeal(buildDealFromLeadDetail(lead), {
                        forceStudyModal: true,
                      });
                    }}
                  >
                    <Gauge className="h-4 w-4 opacity-80" aria-hidden />
                    Simular sistema solar
                  </button>
                  <Link href={`/clientes/${lead.id}`} className={cn(quickOutlineClass)}>
                    <Calendar className="h-4 w-4 opacity-80" aria-hidden />
                    Registrar contato
                  </Link>
                  <Link href={`/clientes/${lead.id}`} className={cn(quickOutlineClass)}>
                    <Pencil className="h-4 w-4 opacity-80" aria-hidden />
                    Editar cliente
                  </Link>
                </div>
              </section>

              <Link
                href={`/clientes/${lead.id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-[var(--color-primary-700)] transition-colors hover:text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary-400)]"
              >
                Ver ficha completa
                <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
              </Link>
            </div>

            <SetNextStepDialog
              open={scheduleOpen}
              onOpenChange={setScheduleOpen}
              organizationId={organizationId}
              leadId={lead.id}
              dealId={latestDeal?.id}
              leadName={lead.name}
              onSaved={() => reloadLead()}
            />
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
