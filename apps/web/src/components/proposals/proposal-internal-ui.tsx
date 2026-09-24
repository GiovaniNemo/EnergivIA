"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  LayoutTemplate,
  Lightbulb,
  LineChart,
  Loader2,
  MoreVertical,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@energivia/utils";

const outlineSmLinkClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-medium transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

const outlineDefaultLinkClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

export const MARGIN_RECOMMENDED_PCT = 20;
export const MARGIN_CRITICAL_PCT = 10;

export function formatBRL(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type MarginHealth = "none" | "good" | "warn" | "bad";

export function getMarginHealth(marginPct: number | null): MarginHealth {
  if (marginPct === null || Number.isNaN(marginPct)) return "none";
  if (marginPct >= MARGIN_RECOMMENDED_PCT) return "good";
  if (marginPct >= MARGIN_CRITICAL_PCT) return "warn";
  return "bad";
}

const marginHealthStyles: Record<Exclude<MarginHealth, "none">, string> = {
  good: "border-emerald-500/40 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]",
  warn: "border-amber-500/40 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
  bad: "border-red-500/45 bg-red-500/[0.06] dark:bg-red-500/[0.08]",
};

const marginHealthLabel: Record<Exclude<MarginHealth, "none">, string> = {
  good: "Margem saudável",
  warn: "Atenção à margem",
  bad: "Margem abaixo do mínimo sugerido",
};

export type ProposalInternalHeaderProps = {
  leadId: string;
  leadName: string;
  title: string;
  statusLabel: string;
  validUntilLabel: string;
  onSendToClient: () => void;
  onCloseProposal: () => void;
  publicProposalPath: string;
  templateEditorUrl: string | null;
  canEditTemplate: boolean;
  onCopyPublicLink: () => void;
  copyState: "idle" | "done" | "err";
  onExportPdf: () => void;
  pdfLoading: boolean;
  pdfError: string | null;
  showSentPdfLink: boolean;
  sentPdfUrl: string | null;
  financingLabel: string;
  selectedTemplateId: string;
  onTemplateChange: (id: string) => void;
  templates: Array<{ id: string; name: string; version: number }>;
  templateSaving: boolean;
  previewLayoutHref: string | null;
  templateError?: string | null;
};

export function ProposalInternalHeader({
  leadId,
  leadName,
  title,
  statusLabel,
  validUntilLabel,
  onSendToClient,
  onCloseProposal,
  publicProposalPath,
  templateEditorUrl: _templateEditorUrl,
  canEditTemplate: _canEditTemplate,
  onCopyPublicLink,
  copyState,
  onExportPdf,
  pdfLoading,
  pdfError,
  showSentPdfLink,
  sentPdfUrl,
  financingLabel,
  selectedTemplateId,
  onTemplateChange,
  templates,
  templateSaving,
  previewLayoutHref,
  templateError,
}: ProposalInternalHeaderProps): JSX.Element {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActionsOpen) return;
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (actionsRef.current?.contains(target)) return;
      setIsActionsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsActionsOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionsOpen]);

  return (
    <header className="space-y-5 border-b border-[var(--color-border)] pb-8">
      <Link
        href={`/clientes/${leadId}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Cliente · {leadName}</span>
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-foreground)]">
                {statusLabel}
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Válida até{" "}
                <span className="font-medium text-[var(--color-foreground)]">
                  {validUntilLabel}
                </span>
              </span>
              <span className="rounded-md bg-[var(--color-muted)]/40 px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                {financingLabel}
              </span>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              Cockpit de decisão: à esquerda o que vende; à direita o que protege sua margem. O
              cliente vê só o link público.
            </p>
          </div>

          <ProposalConversionHint />
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-lg lg:shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 gap-2 !bg-emerald-600 text-sm font-semibold !text-white shadow-md shadow-emerald-950/25 hover:!bg-emerald-700 whitespace-nowrap"
              sx={{
                bgcolor: "#059669 !important",
                color: "#ffffff !important",
                "&:hover": { bgcolor: "#047857 !important" },
              }}
              onClick={onSendToClient}
            >
              <Send className="h-4 w-4 shrink-0" />
              Enviar proposta
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-emerald-950/50 text-sm font-semibold shadow-sm whitespace-nowrap"
              variant="outline"
              onClick={onCloseProposal}
            >
              Fechar proposta
            </Button>

            <div className="relative shrink-0" ref={actionsRef}>
              <Button
                type="button"
                variant="outline"
                aria-label="Mais ações da proposta"
                aria-expanded={isActionsOpen}
                className="h-12 w-12 shrink-0 p-0 border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-emerald-500 transition-colors shadow-sm"
                onClick={() => setIsActionsOpen((prev) => !prev)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {isActionsOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-xl shadow-black/25 animate-in fade-in zoom-in-95">
                  <a
                    href={publicProposalPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsActionsOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
                  >
                    <ExternalLink className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <span>Ver proposta do cliente</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      onCopyPublicLink();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
                  >
                    {copyState === "done" ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Link copiado!
                        </span>
                      </>
                    ) : copyState === "err" ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-red-500">Erro ao copiar</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={pdfLoading}
                    onClick={() => {
                      onExportPdf();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        <span>Gerando PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        <span>Exportar PDF</span>
                      </>
                    )}
                  </button>

                  {showSentPdfLink && sentPdfUrl ? (
                    <a
                      href={sentPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsActionsOpen(false)}
                      className="mt-1 flex w-full items-center gap-2.5 border-t border-[var(--color-border)]/60 pt-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
                    >
                      <ExternalLink className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      <span>Abrir PDF já enviado</span>
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {pdfError ? <p className="text-xs text-red-600 dark:text-red-400">{pdfError}</p> : null}

          {/* Seleção do Layout no Topo (coluna direita, abaixo dos botões) */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="top-proposal-layout-select"
                className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5"
              >
                <LayoutTemplate className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Layout da proposta
              </label>
              {templateSaving && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="top-proposal-layout-select"
                  value={selectedTemplateId}
                  onChange={(e) => onTemplateChange(e.target.value as string)}
                  disabled={templateSaving}
                >
                  <option value="">Selecione um template publicado</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (v{t.version})
                    </option>
                  ))}
                </Select>
              </div>
              {previewLayoutHref ? (
                <a
                  href={previewLayoutHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Pré-visualizar layout"
                  className={cn(outlineSmLinkClass, "shrink-0 px-2.5")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ver</span>
                </a>
              ) : null}
            </div>
            {templateError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{templateError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export type ProposalSalesHeroProps = {
  monthlySavings: number;
  investment: number;
  paybackYears: number;
  totalSavings25y: number;
  annualSavingsFirstYear: number | null;
  billSavingsPct: number | null;
  paybackClassName: string;
  paybackWarning: boolean;
};

export function ProposalSalesHeroCard({
  monthlySavings,
  investment,
  paybackYears,
  totalSavings25y,
  annualSavingsFirstYear,
  billSavingsPct,
  paybackClassName,
  paybackWarning,
}: ProposalSalesHeroProps): JSX.Element {
  return (
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.07] to-transparent shadow-none"
      )}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500/80" aria-hidden />
      <CardHeader className="space-y-1 pb-2 pl-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Visão de venda
        </p>
        <CardTitle className="text-lg font-semibold">O que apresentar ao cliente</CardTitle>
        <CardDescription className="text-xs">
          Números que costumam destravar a decisão.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-0 pl-5">
        <div>
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
            Economia mensal (est.)
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-4xl">
            {formatBRL(monthlySavings)}
          </p>
          {billSavingsPct !== null ? (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              ≈ {billSavingsPct.toFixed(1)}% da conta atual estimada
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)]/80 pt-4">
          <div>
            <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
              Investimento
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">{formatBRL(investment)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">Payback</p>
            <p className={cn("mt-0.5 text-base font-semibold tabular-nums", paybackClassName)}>
              {paybackYears} anos
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
              Economia em 25 anos
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-700/90 dark:text-emerald-400/90">
              {formatBRL(totalSavings25y)}
            </p>
          </div>
          {annualSavingsFirstYear !== null ? (
            <div>
              <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                1º ano (est.)
              </p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">
                {formatBRL(annualSavingsFirstYear)}
              </p>
            </div>
          ) : null}
        </div>
        {paybackWarning ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-900 dark:text-amber-100/90">
            Payback alto — valide consumo, tarifa e premissas com o cliente antes de fechar.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export type ProposalBusinessHeroProps = {
  hasKit: boolean;
  marginPct: number | null;
  marginAppliedBrl: number | null;
  laborAppliedBrl: number | null;
  hasRuleCostBreakdown: boolean;
  equipmentCost: number | null;
  remainderAfterEquipmentBrl: number | null;
  saleToClient: number;
  health: MarginHealth;
  isEditingMargin?: boolean;
  onEditMarginClick?: () => void;
  marginOverrideDraft?: number | null;
  onMarginOverrideChange?: (val: number | null) => void;
  marginOverrideSaving?: boolean;
  onSaveMarginOverride?: () => void;
  onCancelMarginEdit?: () => void;
  isEditingMarginPct?: boolean;
  onEditMarginPctClick?: () => void;
  marginPctDraft?: number | null;
  onMarginPctDraftChange?: (val: number | null) => void;
  marginPctSaving?: boolean;
  onSaveMarginPct?: () => void;
  onCancelMarginPctEdit?: () => void;
  nonMarginBaseCost?: number | null;
  isEditingLabor?: boolean;
  onEditLaborClick?: () => void;
  laborOverrideDraft?: number | null;
  onLaborOverrideChange?: (val: number | null) => void;
  laborOverrideSaving?: boolean;
  onSaveLaborOverride?: () => void;
  onCancelLaborEdit?: () => void;
};

export function ProposalBusinessHeroCard({
  hasKit,
  marginPct,
  marginAppliedBrl,
  laborAppliedBrl,
  hasRuleCostBreakdown,
  equipmentCost,
  remainderAfterEquipmentBrl,
  saleToClient,
  health,
  isEditingMargin,
  onEditMarginClick,
  marginOverrideDraft,
  onMarginOverrideChange,
  marginOverrideSaving,
  onSaveMarginOverride,
  onCancelMarginEdit,
  isEditingMarginPct,
  onEditMarginPctClick,
  marginPctDraft,
  onMarginPctDraftChange,
  marginPctSaving,
  onSaveMarginPct,
  onCancelMarginPctEdit,
  nonMarginBaseCost,
  isEditingLabor,
  onEditLaborClick,
  laborOverrideDraft,
  onLaborOverrideChange,
  laborOverrideSaving,
  onSaveLaborOverride,
  onCancelLaborEdit,
}: ProposalBusinessHeroProps): JSX.Element {
  const [hideSensitiveValues, setHideSensitiveValues] = useState(false);
  const activeHealth = health === "none" ? null : health;

  const previewMarginBrl =
    nonMarginBaseCost != null &&
    marginPctDraft != null &&
    marginPctDraft >= 0 &&
    marginPctDraft < 100
      ? Math.round(
          ((nonMarginBaseCost * (marginPctDraft / 100)) / (1 - marginPctDraft / 100)) * 100
        ) / 100
      : null;
  const previewSaleBrl =
    nonMarginBaseCost != null && previewMarginBrl != null
      ? Math.round((nonMarginBaseCost + previewMarginBrl) * 100) / 100
      : null;

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-[var(--color-border)] shadow-none",
        activeHealth ? marginHealthStyles[activeHealth] : "bg-[var(--color-card)]"
      )}
    >
      {activeHealth ? (
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1",
            health === "good" && "bg-emerald-500",
            health === "warn" && "bg-amber-500",
            health === "bad" && "bg-red-500"
          )}
          aria-hidden
        />
      ) : (
        <div className="absolute left-0 top-0 h-full w-1 bg-[var(--color-border)]" aria-hidden />
      )}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pl-5 pr-5 pt-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Visão de negócio
          </p>
          <CardTitle className="text-lg font-semibold">Sua margem e custos</CardTitle>
          <CardDescription className="text-xs">Baseado no kit salvo na negociação.</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={() => setHideSensitiveValues((prev) => !prev)}
          title={
            hideSensitiveValues ? "Mostrar valores confidenciais" : "Ocultar valores do cliente"
          }
          aria-label={
            hideSensitiveValues ? "Mostrar valores confidenciais" : "Ocultar valores do cliente"
          }
        >
          {hideSensitiveValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0 pl-5">
        {!hasKit ? (
          <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            Sem kit nesta proposta. Monte o kit no funil para ver margem, custos de projeto e
            equipamentos.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-border)]/70 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Margem bruta
                  </p>
                  {!hideSensitiveValues &&
                  !isEditingMarginPct &&
                  marginPct !== null &&
                  onEditMarginPctClick ? (
                    <button
                      type="button"
                      onClick={onEditMarginPctClick}
                      className="rounded-md bg-[var(--color-accent)] p-1 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                      title="Editar porcentagem de margem"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {isEditingMarginPct ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative w-28">
                        <input
                          id="margin-pct-override-input"
                          type="number"
                          step="0.1"
                          min="0"
                          max="99"
                          value={marginPctDraft ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseFloat(e.target.value);
                            onMarginPctDraftChange?.(val);
                          }}
                          className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 pr-6 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                          placeholder="20"
                          autoFocus
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-muted-foreground)]">
                          %
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={
                          marginPctSaving ||
                          marginPctDraft == null ||
                          marginPctDraft < 0 ||
                          marginPctDraft >= 100
                        }
                        onClick={onSaveMarginPct}
                      >
                        {marginPctSaving ? "..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={marginPctSaving}
                        onClick={onCancelMarginPctEdit}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {previewMarginBrl !== null ? (
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Equivale a{" "}
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {formatBRL(previewMarginBrl)}
                        </span>{" "}
                        de margem (venda: {formatBRL(previewSaleBrl)})
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p
                    className={cn(
                      "mt-0.5 text-3xl font-bold tabular-nums sm:text-4xl",
                      health === "good" && "text-emerald-600 dark:text-emerald-400",
                      health === "warn" && "text-amber-600 dark:text-amber-400",
                      health === "bad" && "text-red-600 dark:text-red-400",
                      health === "none" && "text-[var(--color-foreground)]"
                    )}
                  >
                    {hideSensitiveValues
                      ? "••••"
                      : marginPct !== null
                        ? `${marginPct.toFixed(1)}%`
                        : "—"}
                  </p>
                )}
              </div>
              {!hideSensitiveValues && marginPct !== null ? (
                <div
                  className={cn(
                    "flex max-w-[14rem] items-start gap-1.5 rounded-md px-2 py-1 text-xs",
                    health === "good" &&
                      "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100/90",
                    health === "warn" && "bg-amber-500/15 text-amber-950 dark:text-amber-100/85",
                    health === "bad" && "bg-red-500/15 text-red-950 dark:text-red-100/90"
                  )}
                >
                  {health === "warn" || health === "bad" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : null}
                  <span>
                    {health === "good"
                      ? `Acima ou igual ao recomendado (${MARGIN_RECOMMENDED_PCT}%).`
                      : health === "warn"
                        ? `Abaixo do recomendado (${MARGIN_RECOMMENDED_PCT}%). Revise preço ou kit.`
                        : health === "bad"
                          ? `Margem crítica (abaixo de ${MARGIN_CRITICAL_PCT}%). Ajuste antes de enviar.`
                          : null}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3">
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Margem (regras)
                </p>
                {hideSensitiveValues ? (
                  <div className="mt-1">
                    <p className="text-lg font-semibold tabular-nums text-[var(--color-muted-foreground)]">
                      R$ •••••
                    </p>
                  </div>
                ) : isEditingMargin ? (
                  <div className="mt-2 space-y-2">
                    <CurrencyInput
                      id="margin-override"
                      value={marginOverrideDraft ?? null}
                      onValueChange={(val) => onMarginOverrideChange?.(val)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 w-full text-[10px]"
                        disabled={marginOverrideSaving}
                        onClick={onSaveMarginOverride}
                      >
                        {marginOverrideSaving ? "..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-full text-[10px]"
                        disabled={marginOverrideSaving}
                        onClick={onCancelMarginEdit}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative mt-1">
                    <p className="text-lg font-semibold tabular-nums">
                      {marginAppliedBrl !== null ? formatBRL(marginAppliedBrl) : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={onEditMarginClick}
                      className="absolute right-0 top-0 rounded-md bg-[var(--color-accent)] p-1 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                      title="Editar Margem"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-[var(--color-muted-foreground)]">
                  Sobre o valor fechado (não é lucro líquido)
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3">
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Mão de obra (regras)
                </p>
                {hideSensitiveValues ? (
                  <div className="mt-1">
                    <p className="text-lg font-semibold tabular-nums text-[var(--color-muted-foreground)]">
                      R$ •••••
                    </p>
                  </div>
                ) : isEditingLabor ? (
                  <div className="mt-2 space-y-2">
                    <CurrencyInput
                      id="labor-override"
                      value={laborOverrideDraft ?? null}
                      onValueChange={(val) => onLaborOverrideChange?.(val)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 w-full text-[10px]"
                        disabled={laborOverrideSaving}
                        onClick={onSaveLaborOverride}
                      >
                        {laborOverrideSaving ? "..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-full text-[10px]"
                        disabled={laborOverrideSaving}
                        onClick={onCancelLaborEdit}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative mt-1">
                    <p className="text-lg font-semibold tabular-nums">
                      {laborAppliedBrl !== null ? formatBRL(laborAppliedBrl) : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={onEditLaborClick}
                      className="absolute right-0 top-0 rounded-md bg-[var(--color-accent)] p-1 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                      title="Editar Mão de obra"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-[var(--color-muted-foreground)]">
                  Custo de serviço parametrizado
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3 sm:col-span-1">
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Custo equipamentos
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {hideSensitiveValues
                    ? "R$ •••••"
                    : equipmentCost !== null
                      ? formatBRL(equipmentCost)
                      : "—"}
                </p>
              </div>
              <div className="sm:col-span-3">
                <div className="flex justify-between gap-4 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm">
                  <span className="text-[var(--color-muted-foreground)]">
                    Valor fechado (cliente)
                  </span>
                  <span className="font-semibold tabular-nums">{formatBRL(saleToClient)}</span>
                </div>
                {remainderAfterEquipmentBrl !== null ? (
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    {hideSensitiveValues ? (
                      "Valores de margem e custos do projeto ocultados para exibição ao cliente."
                    ) : (
                      <>
                        Após equipamentos ({formatBRL(equipmentCost ?? 0)}),{" "}
                        <span className="font-medium text-[var(--color-foreground)]">
                          {formatBRL(remainderAfterEquipmentBrl)}
                        </span>{" "}
                        correspondem a custos e margem do projeto (não equipamento).
                        {hasRuleCostBreakdown &&
                        (marginAppliedBrl !== null || laborAppliedBrl !== null) ? (
                          <>
                            {" "}
                            {laborAppliedBrl !== null && marginAppliedBrl !== null
                              ? `Neste snapshot: ${formatBRL(laborAppliedBrl)} mão de obra + ${formatBRL(marginAppliedBrl)} margem.`
                              : laborAppliedBrl !== null
                                ? `Neste snapshot: ${formatBRL(laborAppliedBrl)} em mão de obra.`
                                : `Neste snapshot: ${formatBRL(marginAppliedBrl!)} em margem.`}
                          </>
                        ) : null}
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            {activeHealth && !hideSensitiveValues ? (
              <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                {marginHealthLabel[activeHealth]}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export type ProposalKwpRateBusinessCardProps = {
  systemKw: number;
  ratePerKwp: number;
  saleToClient: number;
  monthlyGenerationKwh?: number | null;
  moduleQuantity?: number | null;
  inverterInfo?: string | null;
};

export function ProposalKwpRateBusinessCard({
  systemKw,
  ratePerKwp,
  saleToClient,
  monthlyGenerationKwh,
  moduleQuantity,
  inverterInfo,
}: ProposalKwpRateBusinessCardProps): JSX.Element {
  const [hideSensitiveValues, setHideSensitiveValues] = useState(false);

  return (
    <Card className="relative flex h-full flex-col overflow-hidden border-[var(--color-border)] bg-[var(--color-card)] shadow-none">
      <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" aria-hidden />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pl-5 pr-5 pt-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Visão de negócio · Preço por kWp
          </p>
          <CardTitle className="text-lg font-semibold">Precificação por kWp</CardTitle>
          <CardDescription className="text-xs">
            Modelo unificado: equipamentos, engenharia, instalação e margem inclusos.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={() => setHideSensitiveValues((prev) => !prev)}
          title={
            hideSensitiveValues ? "Mostrar valores confidenciais" : "Ocultar valores do cliente"
          }
          aria-label={
            hideSensitiveValues ? "Mostrar valores confidenciais" : "Ocultar valores do cliente"
          }
        >
          {hideSensitiveValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0 pl-5">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-border)]/70 pb-3">
          <div>
            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Preço por kWp
            </p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums sm:text-4xl text-emerald-600 dark:text-emerald-400">
              {hideSensitiveValues ? "••••" : `${formatBRL(ratePerKwp)}/kWp`}
            </p>
          </div>
          <div className="flex max-w-[15rem] items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="font-medium leading-tight">
              Preço fechado ao cliente. Sem regras ou margem duplicada.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3">
            <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
              Potência instalada
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
              {systemKw.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}{" "}
              kWp
            </p>
            {moduleQuantity ? (
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                {moduleQuantity} módulos dimensionados
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3">
            <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
              Geração estimada
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
              {monthlyGenerationKwh
                ? `~${monthlyGenerationKwh.toLocaleString("pt-BR")} kWh/mês`
                : "—"}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
              Média mensal de produção
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Valor fechado (cliente)
            </p>
            <p className="mt-1 text-base sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {hideSensitiveValues ? "R$ •••••" : formatBRL(saleToClient)}
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
              Equipamentos + serviços + margem
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-muted)]/15 px-3.5 py-2.5 text-xs text-[var(--color-muted-foreground)]">
          <span className="truncate max-w-[22rem]">
            {inverterInfo
              ? `Equipamentos: ${inverterInfo}`
              : "Composição montada no Perfil do Integrador"}
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            Solução completa
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export type ProposalEquipmentSummaryProps = {
  lineCount: number;
  unitCount: number;
  equipmentSubtotal: number | null;
  hasKit: boolean;
};

export function ProposalEquipmentSummaryCard({
  lineCount,
  unitCount,
  equipmentSubtotal,
  hasKit,
}: ProposalEquipmentSummaryProps): JSX.Element {
  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-muted)]/10 shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">Equipamentos (resumo)</CardTitle>
        <CardDescription className="text-xs">
          Detalhe linha a linha fica na lista abaixo, recolhida por padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {hasKit ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">Itens (linhas)</p>
              <p className="text-lg font-semibold tabular-nums">{lineCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">Unidades</p>
              <p className="text-lg font-semibold tabular-nums">{unitCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Subtotal equipamentos
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {equipmentSubtotal !== null ? formatBRL(equipmentSubtotal) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhum kit salvo — subtotal de equipamentos não disponível.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export type ProposalLayoutSectionProps = {
  selectedTemplateId: string;
  onTemplateChange: (id: string) => void;
  templates: Array<{ id: string; name: string; version: number }>;
  previewHref: string | null;
  templateSaving: boolean;
  onApply: () => void;
  error: string | null;
};

export function ProposalLayoutSection({
  selectedTemplateId,
  onTemplateChange,
  templates,
  previewHref,
  templateSaving,
  onApply,
  error,
}: ProposalLayoutSectionProps): JSX.Element {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Layout da proposta</h2>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        Define a página pública que o cliente abre pelo link.
      </p>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="proposal-layout-select" className="text-xs font-medium">
            Template
          </label>
          <Select
            id="proposal-layout-select"
            value={selectedTemplateId}
            onChange={(e) => onTemplateChange(e.target.value)}
          >
            <option value="">Selecione um template publicado</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (v{t.version})
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className={outlineDefaultLinkClass}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Pré-visualizar layout
            </a>
          ) : (
            <Button type="button" variant="outline" disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              Pré-visualizar layout
            </Button>
          )}
          <Button type="button" variant="default" disabled={templateSaving} onClick={onApply}>
            {templateSaving ? "Aplicando..." : "Aplicar layout"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}

export type ProposalCollapsibleProductsProps = {
  productLineCount: number;
  children: ReactNode;
};

export function ProposalCollapsibleProducts({
  productLineCount,
  children,
}: ProposalCollapsibleProductsProps): JSX.Element {
  return (
    <details className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold">Lista de produtos</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            {productLineCount > 0
              ? `${productLineCount} linha(s) — detalhe técnico para conferência.`
              : "Componentes do dimensionamento (sem kit linha a linha)."}
          </p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--color-border)] p-4 pt-2">{children}</div>
    </details>
  );
}

export type ProposalCollapsibleTechnicalProps = {
  children: ReactNode;
};

export function ProposalCollapsibleTechnical({
  children,
}: ProposalCollapsibleTechnicalProps): JSX.Element {
  return (
    <details className="group rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-muted)]/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-left [&::-webkit-details-marker]:hidden sm:p-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Dimensionamento técnico
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]/90">
            Consumo, potência recomendada e produção — apoio à simulação.
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--color-border)]/60 px-3 pb-4 pt-2 sm:px-4">
        {children}
      </div>
    </details>
  );
}

export function ProposalConversionHint(): JSX.Element {
  return (
    <div className="flex max-w-xl gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-3.5 sm:p-4">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-[var(--color-foreground)]">Dica de conversão</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          Quem envia o link no mesmo dia da reunião costuma receber retorno mais rápido. Combine o
          envio com um follow-up em 48h.
        </p>
      </div>
    </div>
  );
}

export type ProposalScenarioActionsProps = {
  pipelineHref: string;
  financingModeLabel: string;
};

export function ProposalScenarioActions({
  pipelineHref,
  financingModeLabel,
}: ProposalScenarioActionsProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)]/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={pipelineHref} className={cn(outlineSmLinkClass, "gap-2")}>
        <LineChart className="h-4 w-4" />
        Cenários no funil
      </Link>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Simulação salva:{" "}
        <span className="font-medium text-[var(--color-foreground)]">{financingModeLabel}</span>
        {" — "}
        altere premissas na negociação para atualizar estes números.
      </p>
    </div>
  );
}
