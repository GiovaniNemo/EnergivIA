"use client";

import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { PageWidth, ProposalDocumentJson, Spacing } from "./types";
import { Cover } from "@/components/sections/Cover/Cover";
import type { CoverContent, CoverVariant } from "@/components/sections/Cover/cover-utils";
import { SectionShell } from "./section-render/section-shell";
import { renderSectionContent } from "./section-render/section-registry";
import type {
  PreviewRenderVariables,
  SectionRenderOptions,
  SectionRenderMode,
} from "./section-render/types";

interface PreviewDocumentProps {
  title: string;
  documentState: ProposalDocumentJson;
  selectedSectionId?: string;
  onSelectSection?: (sectionId: string, fieldName?: string) => void;
  onSectionHeightChange?: (sectionId: string, heightPercent: number) => void;
  interactionScale?: number;
  sectionRenderOptions?: SectionRenderOptions;
  mode?: SectionRenderMode;
  viewport?: "desktop" | "mobile" | "pdf";
  publicLayout?: boolean;
}

function replaceVariablesServerSafe(html: string, values: Record<string, string | number>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const resolved = values[key.trim()];
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

function parseMoneyLikeServerSafe(value: unknown, fallback: number = Number.NaN): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return fallback;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function replaceTemplateText(value: unknown, vars: Record<string, string | number>): string {
  if (typeof value !== "string") return "";
  return replaceVariablesServerSafe(value, vars);
}

function resolveColorField(
  sectionValue: unknown,
  fallback: string | undefined,
  hardFallback: string
): string {
  const candidate =
    typeof sectionValue === "string" && sectionValue.trim()
      ? sectionValue.trim()
      : (fallback ?? "").trim();
  return candidate || hardFallback;
}

function resolveOptionalColor(sectionValue: unknown, fallback?: string): string | undefined {
  const sectionColor = typeof sectionValue === "string" ? sectionValue.trim() : "";
  if (sectionColor) return sectionColor;
  const fallbackColor = typeof fallback === "string" ? fallback.trim() : "";
  return fallbackColor || undefined;
}

function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return normalized;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatKwpDisplay(value: unknown): string {
  const numeric = parseMoneyLikeServerSafe(value, Number.NaN);
  if (!Number.isFinite(numeric)) {
    return typeof value === "string" ? value.trim() : "";
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function computeDiagnosticProjectedCosts(
  monthlyBill: number,
  taxaReajusteAnual?: string
): {
  gastoAnual: number;
  custo5: number;
  custo10: number;
} {
  const annualCost = monthlyBill * 12;
  const increaseRate = Math.max(0, Math.min(0.2, Number(taxaReajusteAnual ?? "8") / 100));
  const projectYears = (years: number) => {
    let total = 0;
    let currentAnnual = annualCost;
    for (let year = 0; year < years; year += 1) {
      total += currentAnnual;
      currentAnnual *= 1 + increaseRate;
    }
    return Math.round(total);
  };

  return {
    gastoAnual: Math.round(annualCost),
    custo5: projectYears(5),
    custo10: projectYears(10),
  };
}

function resolveDisplayAssetUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  try {
    const parsed = new URL(raw);
    const isPresignedPutUrl =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedPutUrl) return raw;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return raw;
  }
}

function resolvePreviewFontFamily(
  fontFamily: ProposalDocumentJson["styles"]["typography"]["fontFamily"]
): string {
  const map: Record<ProposalDocumentJson["styles"]["typography"]["fontFamily"], string> = {
    Inter: `var(--font-sans)`,
    Roboto: `var(--font-roboto)`,
    "Open Sans": `var(--font-open-sans)`,
    Montserrat: `var(--font-montserrat)`,
  };
  return map[fontFamily];
}

function resolveDividerToggle(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizePreviewVariables(
  base: PreviewRenderVariables
): PreviewRenderVariables & { hasDiagnosticData: boolean } {
  const parsedMonthlyBill = parseMoneyLikeServerSafe(
    base.conta_mensal_energia ?? base.conta_mensal_energia_br,
    NaN
  );
  const hasDiagnosticData = Number.isFinite(parsedMonthlyBill) && parsedMonthlyBill > 0;
  if (!hasDiagnosticData) {
    return {
      ...base,
      conta_mensal_energia: undefined,
      gasto_anual_energia: undefined,
      custo_5_anos_energia: undefined,
      custo_10_anos_energia: undefined,
      conta_mensal_energia_br: undefined,
      gasto_anual_energia_br: undefined,
      custo_5_anos_energia_br: undefined,
      custo_10_anos_energia_br: undefined,
      hasDiagnosticData: false,
    };
  }

  const projected = computeDiagnosticProjectedCosts(parsedMonthlyBill, base.taxa_reajuste_anual);
  return {
    ...base,
    conta_mensal_energia: parsedMonthlyBill,
    gasto_anual_energia: projected.gastoAnual,
    custo_5_anos_energia: projected.custo5,
    custo_10_anos_energia: projected.custo10,
    conta_mensal_energia_br: formatBRL(parsedMonthlyBill),
    gasto_anual_energia_br: formatBRL(projected.gastoAnual),
    custo_5_anos_energia_br: formatBRL(projected.custo5),
    custo_10_anos_energia_br: formatBRL(projected.custo10),
    hasDiagnosticData: true,
  };
}

export function PreviewDocument({
  title,
  documentState,
  selectedSectionId,
  onSelectSection,
  onSectionHeightChange,
  interactionScale = 1,
  sectionRenderOptions,
  mode = "web",
  viewport = "desktop",
  publicLayout = false,
}: PreviewDocumentProps): JSX.Element {
  const hoveredEditableRef = useRef<HTMLElement | null>(null);
  const DESKTOP_PREVIEW_MIN_WIDTH = 980;
  const { styles, variables } = documentState;
  const activeBorderColor = withAlpha(styles.branding.primaryColor, 0.55);
  const activeBadgeBackground = withAlpha(styles.branding.primaryColor, 0.9);
  const mockRuntimeData: PreviewRenderVariables = {
    nome_cliente: "Carlos Mendes",
    nome_empresa: "Solar Prime Energia",
    data_proposta: new Date().toLocaleDateString("pt-BR"),
    tamanho_sistema_kw: "8.40 kWp",
    modulos_sistema: "14 x 600W Mono PERC",
    inversor_sistema: "1 x 8kW String Inverter",
    producao_anual: "11,760 kWh/ano",
    investimento_total: "R$ 45.300,00",
    investimento_desconto: "R$ 2.000,00",
    economia_mensal: "R$ 612,00",
    economia_anual: "R$ 7.344,00",
    payback_anos: "3,8 anos",
    financiamento_parcela: "R$ 529,00",
    financiamento_meses: "96 meses",
    financiamento_entrada: "R$ 0,00",
    comparacao_antes: "R$ 690,00",
    comparacao_depois: "R$ 115,00",
    conta_mensal_energia: 650,
    taxa_reajuste_anual: "8",
    potencia_sistema_kwp: 8,
    geracao_mensal_kwh: 872,
    cobertura_consumo_pct: 80,
    equivalente_arvores_ano: 240,
  };
  const emptyRuntimeData: PreviewRenderVariables = {
    nome_cliente: "",
    nome_empresa: "",
    data_proposta: "",
    tamanho_sistema_kw: "",
    modulos_sistema: "",
    inversor_sistema: "",
    producao_anual: "",
    investimento_total: "",
    investimento_desconto: "",
    economia_mensal: "",
    economia_anual: "",
    payback_anos: "",
    financiamento_parcela: "",
    financiamento_meses: "",
    financiamento_entrada: "",
    comparacao_antes: "",
    comparacao_depois: "",
  };
  const previewVariables = normalizePreviewVariables({
    ...(publicLayout ? emptyRuntimeData : mockRuntimeData),
    ...variables,
  });

  const sectionContentOptions = useMemo<SectionRenderOptions>(
    () => ({
      ...sectionRenderOptions,
      branding: {
        primaryColor: styles.branding.primaryColor,
        secondaryColor: styles.branding.secondaryColor,
        textColor: styles.branding.textColor,
        backgroundColor: styles.branding.backgroundColor,
        ...sectionRenderOptions?.branding,
      },
    }),
    [
      sectionRenderOptions,
      styles.branding.primaryColor,
      styles.branding.secondaryColor,
      styles.branding.textColor,
      styles.branding.backgroundColor,
    ]
  );

  const desktopWidthPxByPageWidth: Record<PageWidth, number> = {
    narrow: 720,
    medium: 920,
    wide: 1180,
  };
  const desktopPreviewWidthPx = Math.max(
    DESKTOP_PREVIEW_MIN_WIDTH,
    desktopWidthPxByPageWidth[styles.layout.pageWidth]
  );
  const viewportWidthClass: Record<"desktop" | "mobile" | "pdf", string> = {
    desktop: "max-w-none",
    mobile: "w-[390px] max-w-none",
    pdf: "max-w-[794px]",
  };
  const interactive = typeof onSelectSection === "function";
  const resizeDragRef = useRef<{
    sectionId: string;
    startY: number;
    startHeightPercent: number;
  } | null>(null);

  function clampHeightPercent(value: number): number {
    return Math.max(100, Math.min(300, Math.round(value)));
  }

  function startSectionHeightDrag(
    sectionId: string,
    initialHeightPercent: number,
    event: ReactPointerEvent<HTMLButtonElement>
  ): void {
    if (!onSectionHeightChange || !interactive) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerTarget = event.currentTarget;
    pointerTarget.setPointerCapture?.(event.pointerId);
    const normalizedScale = Math.max(0.25, Math.min(2, interactionScale || 1));
    const sectionElement = event.currentTarget.closest(
      "[data-preview-section-id]"
    ) as HTMLElement | null;
    const renderedHeightPx = sectionElement ? sectionElement.getBoundingClientRect().height : 0;
    const renderedUnscaledPx = renderedHeightPx > 0 ? renderedHeightPx / normalizedScale : 0;
    const baseHeightPx = 250;
    const renderedHeightPercent =
      renderedUnscaledPx > 0 ? (renderedUnscaledPx / baseHeightPx) * 100 : initialHeightPercent;
    const startHeightPercent = clampHeightPercent(
      Math.max(initialHeightPercent, renderedHeightPercent)
    );

    resizeDragRef.current = {
      sectionId,
      startY: event.clientY,
      startHeightPercent,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const drag = resizeDragRef.current;
      if (!drag) return;
      const deltaY = moveEvent.clientY - drag.startY;
      const deltaPercent = (deltaY / (baseHeightPx * normalizedScale)) * 100;
      onSectionHeightChange(
        drag.sectionId,
        clampHeightPercent(drag.startHeightPercent + deltaPercent)
      );
    };
    const finishDrag = () => {
      resizeDragRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  }
  function resolveTargetElement(target: EventTarget | null): Element | null {
    if (target instanceof Element) return target;
    if (target instanceof Node) return target.parentElement;
    return null;
  }
  function resolveFieldPathFromTarget(target: EventTarget | null): string | undefined {
    const element = resolveTargetElement(target);
    if (!element) return undefined;
    return (
      element.closest("[data-editor-field-path]")?.getAttribute("data-editor-field-path") ??
      undefined
    );
  }
  function clearHoverHighlight(): void {
    if (!hoveredEditableRef.current) return;
    hoveredEditableRef.current.classList.remove("preview-editable-target-active");
    hoveredEditableRef.current = null;
  }
  function updateHoverHighlight(target: EventTarget | null): void {
    if (!interactive) return;
    const node = resolveTargetElement(target);
    const hit = node?.closest("[data-editor-field-path]") as HTMLElement | null;
    const fieldName = resolveFieldPathFromTarget(target);
    if (!hit || !fieldName) {
      clearHoverHighlight();
      return;
    }
    if (hoveredEditableRef.current && hoveredEditableRef.current !== hit) {
      hoveredEditableRef.current.classList.remove("preview-editable-target-active");
    }
    hoveredEditableRef.current = hit;
    hoveredEditableRef.current.classList.add("preview-editable-target-active");
  }
  const sectionPaddingClass: Record<Spacing, string> = {
    compact: "pb-2",
    normal: "pb-4",
    relaxed: "pb-6",
  };
  const coverSection = documentState.sections.find(
    (section) => !section.hidden && section.type === "cover"
  );
  const coverFields = (coverSection?.fields ?? {}) as Record<string, unknown>;
  const hideLegacyLogo = coverFields["showLogo"] === false;
  const templateVars = previewVariables as unknown as Record<string, string>;
  const resolveCoverPlacement = (value: unknown): "header" | "content" | "footer" => {
    const normalized = String(value ?? "header");
    if (normalized === "content" || normalized === "footer") return normalized;
    return "header";
  };

  const coverContent: CoverContent = {
    title:
      replaceTemplateText(coverFields["title"], templateVars) || styles.cover.titleText || title,
    subtitle: replaceTemplateText(coverFields["subtitle"], templateVars),
    clientName: previewVariables.nome_cliente,
    highlight: replaceTemplateText(coverFields["highlight"], templateVars),
    companyName: previewVariables.nome_empresa || styles.footer.companyName,
    showCompanyName: Boolean(coverFields["showCompanyName"] ?? true),
    companyNamePlacement: resolveCoverPlacement(coverFields["companyNamePlacement"]),
    companyNameAlign:
      String(coverFields["companyNameAlign"] ?? "center") === "center"
        ? "center"
        : String(coverFields["companyNameAlign"] ?? "center") === "right"
          ? "right"
          : "left",
    logo: hideLegacyLogo ? "" : String(coverFields["logo"] ?? ""),
    showLogo: !hideLegacyLogo && Boolean(coverFields["showLogo"] ?? true),
    logoPlacement: resolveCoverPlacement(coverFields["logoPlacement"]),
    logoAlign:
      String(coverFields["logoAlign"] ?? "left") === "center"
        ? "center"
        : String(coverFields["logoAlign"] ?? "left") === "right"
          ? "right"
          : "left",
    logoSize: (() => {
      const n = Number(coverFields["logoSize"] ?? 100);
      if (!Number.isFinite(n)) return 100;
      return Math.max(50, Math.min(200, Math.round(n)));
    })(),
    date: previewVariables.data_proposta,
    potenciaKwp: formatKwpDisplay(previewVariables.potencia_sistema_kwp),
    geracaoMensal:
      previewVariables.geracao_mensal_kwh != null
        ? String(previewVariables.geracao_mensal_kwh)
        : "",
    coberturaConsumo:
      previewVariables.cobertura_consumo_pct != null
        ? String(previewVariables.cobertura_consumo_pct)
        : "",
    equivalenteArvores:
      previewVariables.equivalente_arvores_ano != null
        ? String(previewVariables.equivalente_arvores_ano)
        : "",
  };

  const coverStyle = {
    backgroundImage:
      resolveDisplayAssetUrl(coverFields["backgroundImage"]) ||
      resolveDisplayAssetUrl(styles.cover.imageUrl),
    coverHeight: Number(coverFields["coverHeight"] ?? 100),
    overlayColor: resolveOptionalColor(
      coverFields["overlayColor"],
      styles.cover.overlayColor === "#020617" ? "" : styles.cover.overlayColor
    ),
    overlayOpacity: resolveOptionalColor(
      coverFields["overlayColor"],
      styles.cover.overlayColor === "#020617" ? "" : styles.cover.overlayColor
    )
      ? Number(coverFields["overlayOpacity"] ?? styles.cover.overlayOpacity)
      : 0,
    textColor: resolveColorField(coverFields["textColor"], styles.branding.textColor, "#ffffff"),
    alignment: String(coverFields["alignment"] ?? "center") as
      | "left"
      | "center"
      | "right"
      | "top-left"
      | "top-center"
      | "top-right"
      | "middle-left"
      | "middle-center"
      | "middle-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right",
    backgroundColor: (() => {
      const templateBg = styles.branding.backgroundColor || "#0f172a";
      const coverBg =
        typeof coverFields["backgroundColor"] === "string"
          ? coverFields["backgroundColor"].trim()
          : "";
      return coverBg && coverBg !== templateBg ? coverBg : templateBg;
    })(),
  };
  const visibleSections = documentState.sections.filter((section) => {
    if (section.hidden || section.type === "cover") return false;
    if (section.type !== "diagnostic_energy") return true;
    return previewVariables.hasDiagnosticData;
  });

  if (mode === "pdf") {
    return (
      <div
        data-preview-scroll="true"
        className="h-full overflow-y-auto overflow-x-hidden rounded-2xl bg-[#060b16]"
      >
        <div className="space-y-4">
          <article
            data-preview-capture-target="true"
            className="mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden rounded-2xl border border-zinc-700/80"
            style={{
              fontFamily: resolvePreviewFontFamily(styles.typography.fontFamily),
              fontSize: `${styles.typography.bodySize}px`,
              backgroundColor: styles.branding.backgroundColor,
              color: styles.branding.textColor,
              borderRadius: `${styles.layout.borderRadius}px`,
              boxShadow: `0 ${styles.layout.shadowIntensity * 8}px ${styles.layout.shadowIntensity * 26}px rgba(0,0,0,0.28)`,
              pageBreakAfter: "always",
              breakAfter: "page",
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <Cover
              variant={(coverSection?.variant ?? "hero-cinematic") as CoverVariant}
              content={coverContent}
              style={coverStyle}
              typography={styles.typography}
              organization={{
                companyName: previewVariables.nome_empresa || styles.footer.companyName,
                logo: hideLegacyLogo ? "" : resolveDisplayAssetUrl(styles.branding.logoUrl),
                primaryColor: styles.branding.primaryColor,
              }}
              showSectionDivider={resolveDividerToggle(coverFields["showSectionDivider"])}
            />
          </article>

          {visibleSections.map((section, index) => (
            <article
              key={section.id}
              className={`mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden rounded-2xl border border-zinc-700/80 ${
                sectionPaddingClass[styles.layout.spacing]
              }`}
              style={{
                fontFamily: resolvePreviewFontFamily(styles.typography.fontFamily),
                fontSize: `${styles.typography.bodySize}px`,
                backgroundColor: styles.branding.backgroundColor,
                color: styles.branding.textColor,
                borderRadius: `${styles.layout.borderRadius}px`,
                boxShadow: `0 ${styles.layout.shadowIntensity * 8}px ${styles.layout.shadowIntensity * 26}px rgba(0,0,0,0.28)`,
                pageBreakAfter: index === visibleSections.length - 1 ? "auto" : "always",
                breakAfter: index === visibleSections.length - 1 ? "auto" : "page",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              <SectionShell
                section={section}
                subtitleSize={styles.typography.subtitleSize}
                vars={previewVariables}
                defaults={{
                  textColor: styles.branding.textColor,
                  backgroundColor: styles.branding.backgroundColor,
                  primaryColor: styles.branding.primaryColor,
                  secondaryColor: styles.branding.secondaryColor,
                }}
              >
                {renderSectionContent(section, previewVariables, {
                  ...sectionContentOptions,
                  mode,
                })}
              </SectionShell>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const scrollShellClass = publicLayout
    ? "h-full overflow-y-auto overflow-x-hidden bg-transparent"
    : "h-full overflow-y-auto overflow-x-hidden rounded-2xl bg-[#060b16]";

  const articleFrameClass =
    publicLayout && mode === "web"
      ? "proposal-preview-cq mx-0 w-full max-w-none overflow-hidden border border-[var(--color-border)]"
      : `proposal-preview-cq mx-auto overflow-hidden rounded-2xl border border-zinc-700/80 ${viewportWidthClass[viewport]}`;

  const articleWidthStyle =
    viewport === "desktop" && mode === "web" && !publicLayout
      ? { width: `${desktopPreviewWidthPx}px` }
      : {};

  const articleShadow =
    publicLayout && mode === "web"
      ? `0 ${4 + styles.layout.shadowIntensity * 10}px ${14 + styles.layout.shadowIntensity * 32}px rgba(0,0,0,0.14)`
      : `0 ${styles.layout.shadowIntensity * 8}px ${styles.layout.shadowIntensity * 26}px rgba(0,0,0,0.28)`;

  return (
    <div data-preview-scroll="true" data-preview-viewport={viewport} className={scrollShellClass}>
      <article
        data-preview-capture-target="true"
        className={articleFrameClass}
        style={{
          ...articleWidthStyle,
          fontFamily: resolvePreviewFontFamily(styles.typography.fontFamily),
          fontSize: `${styles.typography.bodySize}px`,
          backgroundColor: styles.branding.backgroundColor,
          color: styles.branding.textColor,
          borderRadius: `${styles.layout.borderRadius}px`,
          boxShadow: articleShadow,
        }}
      >
        <div
          data-preview-section-id={coverSection?.id}
          onClick={
            interactive
              ? (event) => {
                  if (!coverSection?.id) return;
                  const fieldName = resolveFieldPathFromTarget(event.target);
                  onSelectSection?.(coverSection.id, fieldName);
                }
              : undefined
          }
          onMouseMove={
            interactive
              ? (event) => {
                  updateHoverHighlight(event.target);
                }
              : undefined
          }
          onMouseLeave={interactive ? clearHoverHighlight : undefined}
          className={`preview-editable-hint relative overflow-hidden border border-transparent transition ${
            coverSection?.id && selectedSectionId === coverSection.id
              ? "border-dashed"
              : interactive
                ? "cursor-pointer hover:border-white/20"
                : ""
          }`}
          style={
            coverSection?.id && selectedSectionId === coverSection.id
              ? { borderColor: activeBorderColor }
              : undefined
          }
        >
          {coverSection?.id && selectedSectionId === coverSection.id ? (
            <span
              className="pointer-events-none absolute right-0 top-0 z-20 inline-flex h-5 items-center rounded-l-sm rounded-r-none px-2 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: activeBadgeBackground,
                color: styles.branding.textColor,
              }}
            >
              Ativa
            </span>
          ) : null}
          <Cover
            variant={
              (coverSection?.variant ?? "full-image") as
                | "full-image"
                | "split"
                | "minimal"
                | "card-overlay"
            }
            content={coverContent}
            style={coverStyle}
            typography={styles.typography}
            organization={{
              companyName: previewVariables.nome_empresa || styles.footer.companyName,
              logo: hideLegacyLogo ? "" : resolveDisplayAssetUrl(styles.branding.logoUrl),
              primaryColor: styles.branding.primaryColor,
            }}
            showSectionDivider={resolveDividerToggle(coverFields["showSectionDivider"])}
          />
          {interactive &&
          onSectionHeightChange &&
          coverSection?.id &&
          selectedSectionId === coverSection.id ? (
            <button
              type="button"
              aria-label="Arrastar para ajustar altura da seção"
              onPointerDown={(event) =>
                startSectionHeightDrag(
                  coverSection.id,
                  Number(coverFields["coverHeight"] ?? 100),
                  event
                )
              }
              className="absolute bottom-1 left-1/2 z-30 -translate-x-1/2 rounded-md border border-white/25 bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/60"
            >
              ↕ Altura
            </button>
          ) : null}
        </div>

        <div>
          {visibleSections.map((section) => (
            <div
              key={section.id}
              className={`relative border border-transparent transition ${
                selectedSectionId === section.id
                  ? "border-dashed"
                  : interactive
                    ? "cursor-pointer hover:border-white/20"
                    : ""
              } ${sectionPaddingClass[styles.layout.spacing]}`}
              data-preview-section-id={section.id}
              onClick={
                interactive
                  ? (event) => {
                      const fieldName = resolveFieldPathFromTarget(event.target);
                      onSelectSection?.(section.id, fieldName);
                    }
                  : undefined
              }
              onMouseMove={
                interactive
                  ? (event) => {
                      updateHoverHighlight(event.target);
                    }
                  : undefined
              }
              onMouseLeave={interactive ? clearHoverHighlight : undefined}
              style={
                selectedSectionId === section.id ? { borderColor: activeBorderColor } : undefined
              }
            >
              {selectedSectionId === section.id ? (
                <span
                  className="pointer-events-none absolute right-0 top-0 z-20 inline-flex h-5 items-center rounded-l-sm rounded-r-none px-2 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: activeBadgeBackground,
                    color: styles.branding.textColor,
                  }}
                >
                  Ativa
                </span>
              ) : null}
              <SectionShell
                section={section}
                subtitleSize={styles.typography.subtitleSize}
                vars={previewVariables}
                defaults={{
                  textColor: styles.branding.textColor,
                  backgroundColor: styles.branding.backgroundColor,
                  primaryColor: styles.branding.primaryColor,
                  secondaryColor: styles.branding.secondaryColor,
                }}
              >
                {renderSectionContent(section, previewVariables, {
                  ...sectionContentOptions,
                  mode,
                })}
              </SectionShell>
              {interactive && onSectionHeightChange && selectedSectionId === section.id ? (
                <button
                  type="button"
                  aria-label="Arrastar para ajustar altura da seção"
                  onPointerDown={(event) =>
                    startSectionHeightDrag(
                      section.id,
                      Number((section.fields as Record<string, unknown>)["coverHeight"] ?? 100),
                      event
                    )
                  }
                  className="absolute bottom-1 left-1/2 z-30 -translate-x-1/2 rounded-md border border-white/25 bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/60"
                >
                  ↕ Altura
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
