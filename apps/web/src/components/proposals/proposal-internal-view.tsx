"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, LinkIcon } from "lucide-react";
import {
  getDefaultEssentialRulesForSeeding,
  PROJECT_COST_ESSENTIAL_LABOR_NAME,
  PROJECT_COST_ESSENTIAL_MARGIN_NAME,
} from "@energivia/proposal-economia";
import { percentageBaseShortLabel } from "@/components/project-cost-rules/cost-rule-presets";
import {
  isProposalIntegratorSnapshot,
  type ProposalIntegratorSnapshot,
  type ProposalProjectCostLine,
} from "@energivia/shared-types";
import { createCostRule, listCostRules } from "@/lib/cost-rules-api";
import {
  getProposal,
  setProposalTemplate,
  updateProposalDiscount,
  type ProposalDetail,
  type SystemSizingInputJson,
  type SystemSizingResultJson,
} from "@/lib/leads-api";
import { CurrencyInput } from "@/components/ui/currency-input";
import { listProposalTemplates, type ProposalTemplateEntity } from "@/lib/proposal-templates-api";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { TEMPLATE_THUMBNAIL_DATA_URL_KEY } from "@/lib/proposal-document-to-template-config";
import {
  formatBRL,
  getMarginHealth,
  ProposalBusinessHeroCard,
  ProposalCollapsibleProducts,
  ProposalCollapsibleTechnical,
  ProposalConversionHint,
  ProposalEquipmentSummaryCard,
  ProposalInternalHeader,
  ProposalLayoutSection,
  ProposalSalesHeroCard,
  ProposalScenarioActions,
} from "@/components/proposals/proposal-internal-ui";
import { ProposalEquipmentEditorCard } from "@/components/proposals/proposal-equipment-editor-card";

const PDF_BRANDING = {
  primaryColor: "#059669",
  secondaryColor: "#047857",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
} as const;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  VIEWED: "Visualizada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paybackToneClass(years: number): string {
  if (years > 20) return "text-amber-600 dark:text-amber-400";
  if (years > 12) return "text-[var(--color-muted-foreground)]";
  return "text-emerald-600 dark:text-emerald-400";
}

function extractIntegrator(data: unknown): ProposalIntegratorSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const int = (data as { integrator?: unknown }).integrator;
  return isProposalIntegratorSnapshot(int) ? int : null;
}

function getSizingFromSimulation(
  proposal: ProposalDetail
): { input: SystemSizingInputJson; result: SystemSizingResultJson } | null {
  const si = proposal.simulation.input.sizing;
  const sr = proposal.simulation.result.sizing;
  if (!si || !sr) return null;
  return { input: si, result: sr };
}

function sumProjectCostLinesByName(
  lines: ProposalProjectCostLine[] | undefined,
  name: string
): number | undefined {
  if (!lines?.length) return undefined;
  const hits = lines.filter((l) => l.name === name);
  if (hits.length === 0) return undefined;
  return Math.round(hits.reduce((s, l) => s + l.appliedAmountBrl, 0) * 100) / 100;
}

function computeBillSavingsPct(proposal: ProposalDetail): number | null {
  const sizing = getSizingFromSimulation(proposal);
  const kwh = sizing?.input.monthlyConsumptionKwh;
  const price = proposal.simulation.input.energyPriceKwh;
  const savings = proposal.simulation.result.monthlySavings;
  if (kwh == null || price == null || price <= 0 || savings == null) return null;
  const bill = kwh * price;
  if (bill <= 0) return null;
  return (savings / bill) * 100;
}

function buildInternalPdfBodyHtml(
  proposal: ProposalDetail,
  integrator: ProposalIntegratorSnapshot | null
): string {
  const sizingBlocks = getSizingFromSimulation(proposal);
  const si = sizingBlocks?.result ?? null;
  const simIn = proposal.simulation.input;
  const simRes = proposal.simulation.result;
  const rows: string[] = [];

  if (integrator?.kitItems.length) {
    rows.push(
      "<tr><th>Produto</th><th>Marca</th><th class='num'>Qtd</th><th class='num'>Unit.</th><th class='num'>Total</th></tr>"
    );
    for (const it of integrator.kitItems) {
      rows.push(
        `<tr><td>${escapeHtml(it.productName)}</td><td>${escapeHtml(it.brandName)}</td><td class='num'>${it.quantity}</td><td class='num'>${formatBRL(it.unitPrice)}</td><td class='num'>${formatBRL(it.lineTotal)}</td></tr>`
      );
    }
  }

  const hasKit = Boolean(
    integrator && (integrator.kitItems.length > 0 || integrator.equipmentSubtotalBrl > 0)
  );
  const equipment = hasKit ? integrator!.equipmentSubtotalBrl : 0;
  const quoted = integrator?.quotedSaleBrl ?? simIn.investmentAmount;
  const remainder = hasKit ? Math.round((quoted - equipment) * 100) / 100 : null;

  return `
<div class="proposal-puppeteer-section">
  <p style="font-size:10pt;color:#64748b;margin:0 0 0.5rem">Uso interno — não compartilhar com o cliente sem revisão.</p>
  <h1 style="font-size:18pt;margin:0 0 0.25rem">${escapeHtml(proposal.title)}</h1>
  <p style="margin:0;font-size:11pt">${escapeHtml(proposal.deal.lead.name)} · ${escapeHtml(proposal.deal.lead.whatsapp)}</p>
</div>
<div class="proposal-puppeteer-section">
  <h2 style="font-size:13pt;margin:0 0 0.5rem">Comercial</h2>
  <table>
    <tbody>
      <tr><td>Valor simulado (investimento)</td><td class="num">${formatBRL(quoted)}</td></tr>
      ${
        hasKit
          ? `<tr><td>Subtotal equipamentos</td><td class="num">${formatBRL(equipment)}</td></tr>
      <tr><td>Custos de projeto e margem (após equipamentos, agregado)</td><td class="num">${formatBRL(remainder!)}</td></tr>
      ${
        quoted > 0
          ? `<tr><td>Margem bruta sobre o valor simulado</td><td class="num">${((remainder! / quoted) * 100).toFixed(1)}%</td></tr>`
          : ""
      }`
          : `<tr><td colspan="2">Sem snapshot de kit — detalhamento de equipamentos e margem não disponível.</td></tr>`
      }
    </tbody>
  </table>
</div>
${
  rows.length
    ? `<div class="proposal-puppeteer-section proposal-puppeteer-section--allow-break">
  <h2 style="font-size:13pt;margin:0 0 0.5rem">Lista de produtos</h2>
  <table>${rows.join("")}</table>
</div>`
    : `<div class="proposal-puppeteer-section"><h2 style="font-size:13pt">Lista de produtos</h2><p>${
        si
          ? `Dimensionamento resumido: ${si.panelCount} módulos, ${si.inverterCount} inversor(es), ${si.recommendedPowerKw.toFixed(2)} kWp estimados.`
          : `Sistema comercial: ${simIn.systemSizeKw} kWp — sem dimensionamento técnico embutido nesta simulação.`
      }</p></div>`
}
<div class="proposal-puppeteer-section">
  <h2 style="font-size:13pt;margin:0 0 0.5rem">Simulação</h2>
  <table><tbody>
    <tr><td>Sistema (kW)</td><td class="num">${simIn.systemSizeKw}</td></tr>
    <tr><td>Payback (anos)</td><td class="num">${simRes.paybackYears}</td></tr>
    <tr><td>Economia mensal (est.)</td><td class="num">${formatBRL(simRes.monthlySavings)}</td></tr>
    <tr><td>Economia 25 anos (est.)</td><td class="num">${formatBRL(simRes.totalSavings25y)}</td></tr>
  </tbody></table>
</div>
<style>
  table { width:100%; font-size:10pt; }
  th, td { text-align:left; padding:0.35rem 0.5rem; border-bottom:1px solid #e2e8f0; }
  th { font-weight:600; background:#f8fafc; }
  td.num, th.num { text-align:right; }
</style>
`.trim();
}

export function ProposalInternalView({ proposalId }: { proposalId: string }): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, currentOrganization, loading: orgLoading } = useOrganization();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [templates, setTemplates] = useState<ProposalTemplateEntity[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done" | "err">("idle");
  const [savingCostDefaults, setSavingCostDefaults] = useState(false);
  const [costDefaultsError, setCostDefaultsError] = useState<string | null>(null);
  const [costDefaultsSaved, setCostDefaultsSaved] = useState(false);
  const [orgCostRulesExist, setOrgCostRulesExist] = useState(false);
  const [regeneratedPublicUrl, setRegeneratedPublicUrl] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState<number | null>(null);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const integrator = useMemo(
    () => (proposal ? extractIntegrator(proposal.renderedData) : null),
    [proposal]
  );

  const reload = useCallback(async () => {
    if (!currentOrganizationId || !proposalId) return;
    setLoadError(null);
    try {
      const p = await getProposal(currentOrganizationId, proposalId);
      setProposal(p);
      setSelectedTemplateId(p.proposalTemplate?.id ?? "");
    } catch (e) {
      setProposal(null);
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar a proposta.");
    }
  }, [currentOrganizationId, proposalId]);

  useEffect(() => {
    if (!orgLoading && currentOrganizationId) void reload();
  }, [orgLoading, currentOrganizationId, reload]);

  useEffect(() => {
    setDiscountDraft(proposal?.discountBrl ?? null);
  }, [proposal?.id, proposal?.discountBrl]);

  useEffect(() => {
    if (!currentOrganizationId) return;
    listProposalTemplates(currentOrganizationId)
      .then((all) => setTemplates(all.filter((t) => t.status === "PUBLISHED")))
      .catch(() => setTemplates([]));
  }, [currentOrganizationId]);

  useEffect(() => {
    if (!currentOrganizationId || !integrator?.defaultEssentialCostNames?.length) return;
    listCostRules(currentOrganizationId)
      .then((rules) => {
        const hasLabor = rules.some((r) => r.name === PROJECT_COST_ESSENTIAL_LABOR_NAME);
        const hasMargin = rules.some((r) => r.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME);
        if (hasLabor || hasMargin) setOrgCostRulesExist(true);
      })
      .catch(() => undefined);
  }, [currentOrganizationId, integrator?.defaultEssentialCostNames?.length]);

  const hasEquipmentBreakdown = Boolean(
    integrator && (integrator.kitItems.length > 0 || integrator.equipmentSubtotalBrl > 0)
  );
  const equipmentSubtotal = hasEquipmentBreakdown ? integrator!.equipmentSubtotalBrl : 0;
  const quotedSale = integrator?.quotedSaleBrl ?? proposal?.simulation.input.investmentAmount ?? 0;
  const remainderAgg = hasEquipmentBreakdown
    ? Math.round((quotedSale - equipmentSubtotal) * 100) / 100
    : null;

  const marginAppliedFromRules = sumProjectCostLinesByName(
    integrator?.projectCostLines,
    PROJECT_COST_ESSENTIAL_MARGIN_NAME
  );
  const laborAppliedFromRules = sumProjectCostLinesByName(
    integrator?.projectCostLines,
    PROJECT_COST_ESSENTIAL_LABOR_NAME
  );
  const hasRuleCostBreakdown =
    marginAppliedFromRules !== undefined || laborAppliedFromRules !== undefined;

  const marginPct =
    hasEquipmentBreakdown && quotedSale > 0
      ? marginAppliedFromRules !== undefined
        ? (marginAppliedFromRules / quotedSale) * 100
        : remainderAgg !== null
          ? (remainderAgg / quotedSale) * 100
          : null
      : null;

  const productLineCount = integrator?.kitItems.length ?? 0;
  const componentFallback = proposal
    ? (getSizingFromSimulation(proposal)?.result.components ?? [])
    : [];
  const totalSkuCount = productLineCount > 0 ? productLineCount : componentFallback.length;
  const totalUnits =
    productLineCount > 0
      ? integrator!.kitItems.reduce((s, i) => s + i.quantity, 0)
      : componentFallback.reduce((s, c) => s + c.quantity, 0);

  async function downloadInternalPdf(): Promise<void> {
    if (!proposal) return;
    setPdfError(null);
    setPdfLoading(true);
    try {
      const bodyHtml = buildInternalPdfBodyHtml(proposal, integrator);
      const res = await fetch("/api/proposals/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `interno-${proposal.title}`.slice(0, 80),
          bodyHtml,
          branding: PDF_BRANDING,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta-interno-${proposal.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function copyPublicLink(): Promise<void> {
    if (!proposal) return;
    setCopyState("idle");
    try {
      const url = `${window.location.origin}/proposta/${proposal.publicToken ?? proposal.id}`;
      await navigator.clipboard.writeText(url);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("err");
    }
  }

  function handleEquipmentSaved(publicToken: string): void {
    setRegeneratedPublicUrl(`${window.location.origin}/proposta/${publicToken}`);
    void reload();
  }

  async function sharePublicLinkWithTemplate(): Promise<void> {
    if (!currentOrganizationId || !proposal) return;
    setTemplateError(null);
    setTemplateSaving(true);
    try {
      await setProposalTemplate(currentOrganizationId, proposal.id, selectedTemplateId || null);
      const publicUrl = `${window.location.origin}/proposta/${proposal.publicToken ?? proposal.id}`;
      await navigator.clipboard.writeText(publicUrl);
      setShareDialogOpen(false);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 2500);
      await reload();
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : "Não foi possível compartilhar o link.");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function persistDefaultEssentialCostRules(): Promise<void> {
    if (!currentOrganizationId || !integrator?.defaultEssentialCostNames?.length) return;
    const role = currentOrganization?.role;
    if (role !== "OWNER" && role !== "ADMIN") return;
    setCostDefaultsError(null);
    setSavingCostDefaults(true);
    try {
      const existing = await listCostRules(currentOrganizationId);
      const hasMao = existing.some((r) => r.name === PROJECT_COST_ESSENTIAL_LABOR_NAME);
      const hasMargem = existing.some((r) => r.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME);
      const seeds = getDefaultEssentialRulesForSeeding();
      if (!hasMao) {
        for (const r of seeds.filter((s) => s.name === PROJECT_COST_ESSENTIAL_LABOR_NAME)) {
          await createCostRule(currentOrganizationId, {
            name: r.name,
            calculationType: r.calculationType,
            value: r.value,
            minKwp: r.minKwp,
            maxKwp: r.maxKwp,
            ...(r.calculationType === "PERCENTAGE" && r.percentageBase
              ? { percentageBase: r.percentageBase }
              : {}),
          });
        }
      }
      if (!hasMargem) {
        const m = seeds.find((s) => s.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME);
        if (m) {
          await createCostRule(currentOrganizationId, {
            name: m.name,
            calculationType: m.calculationType,
            value: m.value,
            minKwp: m.minKwp,
            maxKwp: m.maxKwp,
            ...(m.calculationType === "PERCENTAGE" && m.percentageBase
              ? { percentageBase: m.percentageBase }
              : {}),
          });
        }
      }
      setCostDefaultsSaved(true);
    } catch (e) {
      setCostDefaultsError(
        e instanceof Error ? e.message : "Não foi possível guardar as regras na empresa."
      );
    } finally {
      setSavingCostDefaults(false);
    }
  }

  async function saveDiscount(): Promise<void> {
    if (!currentOrganizationId || !proposal) return;
    setDiscountError(null);
    setDiscountSaving(true);
    try {
      const { publicToken } = await updateProposalDiscount(
        currentOrganizationId,
        proposal.id,
        discountDraft
      );
      setRegeneratedPublicUrl(`${window.location.origin}/proposta/${publicToken}`);
      await reload();
    } catch (e) {
      setDiscountError(e instanceof Error ? e.message : "Não foi possível salvar o desconto.");
    } finally {
      setDiscountSaving(false);
    }
  }

  async function saveTemplateBinding(): Promise<void> {
    if (!currentOrganizationId || !proposal) return;
    setTemplateError(null);
    setTemplateSaving(true);
    try {
      await setProposalTemplate(currentOrganizationId, proposal.id, selectedTemplateId || null);
      await reload();
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : "Não foi possível aplicar o layout.");
    } finally {
      setTemplateSaving(false);
    }
  }

  if (orgLoading) {
    return <LoadingState label="Carregando organização" compact />;
  }

  if (!currentOrganizationId) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Selecione uma organização para ver esta proposta.
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      </div>
    );
  }

  if (!proposal) {
    return <LoadingState label="Carregando proposta" compact />;
  }

  const paybackY = proposal.simulation.result.paybackYears;
  const simIn = proposal.simulation.input;
  const simRes = proposal.simulation.result;
  const sizing = getSizingFromSimulation(proposal);
  const billSavingsPct = computeBillSavingsPct(proposal);
  const annualFirst =
    Array.isArray(simRes.annualSavings) && simRes.annualSavings.length > 0
      ? (simRes.annualSavings[0] ?? null)
      : null;

  const publicProposalPath = `/proposta/${proposal.publicToken ?? proposal.id}`;
  const templateIdForEditor = selectedTemplateId || proposal.proposalTemplate?.id || "";
  const templateEditorPath = templateIdForEditor
    ? `/propostas/templates/${templateIdForEditor}`
    : null;
  const previewLayoutHref = selectedTemplateId
    ? `/propostas/templates/${selectedTemplateId}`
    : null;

  const financingLabel =
    simIn.financingType === "FINANCED" ? "Simulação financiada" : "Simulação à vista";
  const financingModeLabel = simIn.financingType === "FINANCED" ? "Financiada" : "À vista";

  const marginHealth = getMarginHealth(marginPct);

  return (
    <div className="w-full min-w-0 space-y-10">
      {copyState === "done" && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Link copiado para a área de transferência
        </div>
      )}
      <ProposalInternalHeader
        leadId={proposal.deal.lead.id}
        leadName={proposal.deal.lead.name}
        title={proposal.title}
        statusLabel={STATUS_LABEL[proposal.status] ?? proposal.status}
        validUntilLabel={new Date(proposal.validUntil).toLocaleDateString("pt-BR")}
        onSendToClient={() => setShareDialogOpen(true)}
        publicProposalPath={publicProposalPath}
        templateEditorUrl={templateEditorPath}
        canEditTemplate={Boolean(templateIdForEditor)}
        onCopyPublicLink={() => void copyPublicLink()}
        copyState={copyState}
        onExportPdf={() => void downloadInternalPdf()}
        pdfLoading={pdfLoading}
        pdfError={pdfError}
        showSentPdfLink={Boolean(proposal.pdfUrl)}
        sentPdfUrl={proposal.pdfUrl}
        financingLabel={financingLabel}
      />

      <section
        className="grid gap-6 lg:grid-cols-2 lg:items-stretch"
        aria-label="Resumo comercial e financeiro"
      >
        <ProposalSalesHeroCard
          monthlySavings={simRes.monthlySavings}
          investment={quotedSale}
          paybackYears={paybackY}
          totalSavings25y={simRes.totalSavings25y}
          annualSavingsFirstYear={annualFirst}
          billSavingsPct={billSavingsPct}
          paybackClassName={paybackToneClass(paybackY)}
          paybackWarning={paybackY > 20}
        />
        <ProposalBusinessHeroCard
          hasKit={hasEquipmentBreakdown}
          marginPct={marginPct}
          marginAppliedBrl={marginAppliedFromRules ?? null}
          laborAppliedBrl={laborAppliedFromRules ?? null}
          hasRuleCostBreakdown={hasRuleCostBreakdown}
          equipmentCost={hasEquipmentBreakdown ? equipmentSubtotal : null}
          remainderAfterEquipmentBrl={remainderAgg}
          saleToClient={quotedSale}
          health={marginHealth}
        />
      </section>

      {regeneratedPublicUrl ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          <LinkIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Equipamentos salvos.{" "}
            <span className="font-semibold">O link anterior foi invalidado</span> — compartilhe o
            novo link com o cliente.
          </span>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              void navigator.clipboard.writeText(regeneratedPublicUrl);
              setCopyState("done");
              window.setTimeout(() => setCopyState("idle"), 2500);
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar novo link
          </Button>
        </div>
      ) : null}

      {hasEquipmentBreakdown ? (
        <ProposalEquipmentEditorCard
          organizationId={currentOrganizationId}
          proposalId={proposal.id}
          onSaved={handleEquipmentSaved}
        />
      ) : null}

      <section
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
        aria-label="Desconto comercial"
      >
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Desconto comercial</h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Aparece como linha separada na proposta do cliente (valor cheio − desconto = total). Deixe
          vazio para não aplicar. Salvar gera um novo link público e invalida o anterior.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-[220px]">
            <CurrencyInput
              id="proposal-discount-edit"
              label="Desconto (R$)"
              value={discountDraft}
              onValueChange={setDiscountDraft}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={discountSaving || (discountDraft ?? 0) === (proposal.discountBrl ?? 0)}
            onClick={() => void saveDiscount()}
          >
            {discountSaving ? "Salvando…" : "Salvar desconto"}
          </Button>
          {discountDraft != null && discountDraft > 0 && quotedSale > 0 ? (
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Total ao cliente:{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {formatBRL(Math.max(0, quotedSale - discountDraft))}
              </span>
            </span>
          ) : null}
        </div>
        {discountError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{discountError}</p>
        ) : null}
      </section>

      {integrator?.notes ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100/90">
          <span className="font-medium">Notas do kit: </span>
          {integrator.notes}
        </p>
      ) : null}

      {integrator?.defaultEssentialCostNames &&
      integrator.defaultEssentialCostNames.length > 0 &&
      !orgCostRulesExist &&
      !costDefaultsSaved ? (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-50/95">
          <p className="font-medium text-sky-900 dark:text-sky-100">
            Custos essenciais por padrão do sistema
          </p>
          <p className="mt-1 text-sky-900/90 dark:text-sky-100/85">
            Esta proposta usou valores padrão para:{" "}
            <span className="font-semibold">
              {integrator.defaultEssentialCostNames.join(" · ")}
            </span>
            . Você pode ajustar o valor comercial na simulação e, para as próximas propostas,
            cadastrar as mesmas regras na empresa.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/configuracoes/custos-projeto"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-accent)]"
            >
              Abrir custos do projeto
            </Link>
            {(currentOrganization?.role === "OWNER" || currentOrganization?.role === "ADMIN") &&
            !costDefaultsSaved ? (
              <Button
                type="button"
                size="sm"
                disabled={savingCostDefaults}
                onClick={() => void persistDefaultEssentialCostRules()}
              >
                {savingCostDefaults ? "A guardar…" : "Guardar estes padrões na empresa"}
              </Button>
            ) : null}
            {costDefaultsSaved ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Regras cadastradas. As próximas propostas usarão os valores da empresa.
              </span>
            ) : null}
          </div>
          {costDefaultsError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{costDefaultsError}</p>
          ) : null}
        </div>
      ) : null}

      {integrator?.projectCostLines && integrator.projectCostLines.length > 0 ? (
        <section
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          aria-label="Custos do projeto aplicados"
        >
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Custos do projeto (regras)
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Linhas usadas para compor o valor comercial desta proposta (equipamento + custos +
            margem).
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Referência</th>
                  <th className="px-3 py-2 text-right font-medium">Valor regra</th>
                  <th className="px-3 py-2 text-right font-medium">Aplicado</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {integrator.projectCostLines.map((line, idx) => (
                  <tr
                    key={`${line.name}-${idx}`}
                    className="border-t border-[var(--color-border)]/70"
                  >
                    <td className="px-3 py-2 font-medium">{line.name}</td>
                    <td className="px-3 py-2 text-[var(--color-muted-foreground)]">
                      {line.calculationType === "FIXED"
                        ? "Fixo (R$)"
                        : line.calculationType === "PER_KWP"
                          ? "Por kWp"
                          : "Percentual (%)"}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                      {line.calculationType === "PERCENTAGE"
                        ? percentageBaseShortLabel(line.percentageBase)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.calculationType === "PERCENTAGE"
                        ? `${line.value}%`
                        : formatBRL(line.value)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatBRL(line.appliedAmountBrl)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {line.source === "system_default" ? (
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-medium text-sky-800 dark:text-sky-200">
                          Padrão sistema
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">Empresa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {typeof integrator.computedSaleFromCostRulesBrl === "number" ? (
            <p className="mt-3 text-right text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
              Total calculado (regras): {formatBRL(integrator.computedSaleFromCostRulesBrl)}
            </p>
          ) : null}
        </section>
      ) : null}

      <ProposalScenarioActions pipelineHref="/pipeline" financingModeLabel={financingModeLabel} />

      <ProposalConversionHint />

      {!hasEquipmentBreakdown ? (
        <>
          <ProposalEquipmentSummaryCard
            lineCount={totalSkuCount}
            unitCount={totalUnits}
            equipmentSubtotal={null}
            hasKit={false}
          />
          <ProposalCollapsibleProducts productLineCount={productLineCount}>
            <ul className="divide-y divide-[var(--color-border)]/60 rounded-lg border border-[var(--color-border)]">
              {componentFallback.length ? (
                componentFallback.map((c, idx) => (
                  <li
                    key={`${c.type}-${idx}`}
                    className="flex justify-between gap-4 px-3 py-2.5 text-sm"
                  >
                    <span className="capitalize">{c.type}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {c.quantity}× {c.spec ?? "—"}
                    </span>
                  </li>
                ))
              ) : (
                <li className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                  Nenhum componente listado no dimensionamento.
                </li>
              )}
            </ul>
          </ProposalCollapsibleProducts>
        </>
      ) : null}

      <ProposalLayoutSection
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={setSelectedTemplateId}
        templates={templates.map((t) => ({ id: t.id, name: t.name, version: t.version }))}
        previewHref={previewLayoutHref}
        templateSaving={templateSaving}
        onApply={() => void saveTemplateBinding()}
        error={templateError}
      />

      <ProposalCollapsibleTechnical>
        {sizing ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-[var(--color-muted-foreground)]">Consumo mensal: </span>
              <span className="font-medium">{sizing.input.monthlyConsumptionKwh} kWh</span>
            </p>
            <p>
              <span className="text-[var(--color-muted-foreground)]">Potência recomendada: </span>
              <span className="font-medium">{sizing.result.recommendedPowerKw} kWp</span>
            </p>
            <p className="sm:col-span-2">
              <span className="text-[var(--color-muted-foreground)]">Produção estimada/mês: </span>
              <span className="font-medium">
                {Math.round(sizing.result.estimatedProductionKwhMonth)} kWh
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Não há consumo/dimensionamento embutido nesta simulação.
          </p>
        )}
      </ProposalCollapsibleTechnical>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent muiMaxWidth={false} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar proposta ao cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Escolha o layout público. Ao confirmar, o vínculo é salvo e o link da proposta é copiado
            para você colar no WhatsApp ou e-mail.
          </p>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum template publicado. Publique um template em Propostas → Templates antes de
              enviar.
            </p>
          ) : (
            <div className="grid max-h-[55vh] gap-3 overflow-auto p-1 md:grid-cols-2">
              {templates.map((t) => {
                const thumb = (t.config?.editor?.styles as Record<string, unknown> | undefined)?.[
                  TEMPLATE_THUMBNAIL_DATA_URL_KEY
                ];
                const checked = selectedTemplateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      checked
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[var(--color-border)] hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-28 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
                        {typeof thumb === "string" && thumb ? (
                          <img
                            src={thumb}
                            alt={`Preview do template ${t.name}`}
                            className="block h-full w-auto object-contain"
                          />
                        ) : (
                          <div className="flex h-full min-w-20 items-center justify-center px-2 text-[10px] text-[var(--color-muted-foreground)]">
                            Sem preview
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">v{t.version}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                          {t.description || "Template sem descrição"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={templateSaving || !selectedTemplateId}
              onClick={() => void sharePublicLinkWithTemplate()}
            >
              {templateSaving ? "Enviando..." : "Salvar layout e copiar link"}
            </Button>
          </div>
          {templateError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{templateError}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
