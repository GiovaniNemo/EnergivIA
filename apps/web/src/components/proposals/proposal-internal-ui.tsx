"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Lightbulb,
  LineChart,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@energivia/utils";

const outlineSmLinkClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-medium transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

const outlineDefaultLinkClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

export const MARGIN_RECOMMENDED_PCT = 20;
export const MARGIN_CRITICAL_PCT = 10;

export function formatBRL(n: number): string {
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
};

export function ProposalInternalHeader({
  leadId,
  leadName,
  title,
  statusLabel,
  validUntilLabel,
  onSendToClient,
  publicProposalPath,
  templateEditorUrl,
  canEditTemplate,
  onCopyPublicLink,
  copyState,
  onExportPdf,
  pdfLoading,
  pdfError,
  showSentPdfLink,
  sentPdfUrl,
  financingLabel,
}: ProposalInternalHeaderProps): JSX.Element {
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
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-foreground)]">
              {statusLabel}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Válida até{" "}
              <span className="font-medium text-[var(--color-foreground)]">{validUntilLabel}</span>
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

        <div className="flex w-full flex-col gap-3 lg:max-w-md lg:shrink-0">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 bg-emerald-600 text-base font-semibold text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-700"
            onClick={onSendToClient}
          >
            <Send className="h-5 w-5 shrink-0" />
            Enviar proposta ao cliente
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <a
              href={publicProposalPath}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(outlineSmLinkClass, "gap-2")}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Ver proposta do cliente
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onCopyPublicLink}
            >
              <Copy className="h-4 w-4 shrink-0" />
              {copyState === "done"
                ? "Link copiado!"
                : copyState === "err"
                  ? "Erro ao copiar"
                  : "Copiar link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={pdfLoading}
              onClick={onExportPdf}
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 shrink-0" />
              )}
              Exportar PDF
            </Button>
            {canEditTemplate && templateEditorUrl ? (
              <Link
                href={templateEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(outlineSmLinkClass, "gap-2")}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                Editar layout
              </Link>
            ) : null}
          </div>
          {showSentPdfLink && sentPdfUrl ? (
            <a
              href={sentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={outlineSmLinkClass}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Abrir PDF já enviado
            </a>
          ) : null}
          {pdfError ? <p className="text-sm text-red-600 dark:text-red-400">{pdfError}</p> : null}
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
}: ProposalBusinessHeroProps): JSX.Element {
  const activeHealth = health === "none" ? null : health;

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
      <CardHeader className="space-y-1 pb-2 pl-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          Visão de negócio
        </p>
        <CardTitle className="text-lg font-semibold">Sua margem e custos</CardTitle>
        <CardDescription className="text-xs">Baseado no kit salvo na negociação.</CardDescription>
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
                <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Margem bruta
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-3xl font-bold tabular-nums sm:text-4xl",
                    health === "good" && "text-emerald-600 dark:text-emerald-400",
                    health === "warn" && "text-amber-600 dark:text-amber-400",
                    health === "bad" && "text-red-600 dark:text-red-400",
                    health === "none" && "text-[var(--color-foreground)]"
                  )}
                >
                  {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
                </p>
              </div>
              {marginPct !== null ? (
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
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {marginAppliedBrl !== null ? formatBRL(marginAppliedBrl) : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                  Sobre o valor fechado (não é lucro líquido)
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3">
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Mão de obra (regras)
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {laborAppliedBrl !== null ? formatBRL(laborAppliedBrl) : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                  Custo de serviço parametrizado
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/50 p-3 sm:col-span-1">
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Custo equipamentos
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {equipmentCost !== null ? formatBRL(equipmentCost) : "—"}
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
                  </p>
                ) : null}
              </div>
            </div>
            {activeHealth ? (
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
    <div className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-4">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-[var(--color-foreground)]">Dica de conversão</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
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
