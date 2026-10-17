"use client";

import type { CSSProperties, ReactNode } from "react";
import { parseMoneyLike, replaceVariables } from "@/components/proposals/editor/utils";
import {
  isLegacyDarkBlue,
  getHexRelativeLuminance,
} from "@/components/proposals/editor/pdf-contrast-utils";
import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";
import { cn, safeHtml } from "@energivia/utils";

function formatBRL(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseAmount(
  vars: PreviewRenderVariables,
  key: "investimento_total" | "investimento_desconto"
): number | null {
  const raw = vars[key];
  const n = parseMoneyLike(
    typeof raw === "string" || typeof raw === "number" ? raw : String(raw ?? ""),
    NaN
  );
  return Number.isFinite(n) ? n : null;
}

const BASE_LINE_LABEL = "Sistema solar";
const BASE_LINE_DESCRIPTION = "Solução fotovoltaica completa";

export const DEFAULT_DEMO_KIT_ITEMS = [
  "16X PAINEL SOLAR LONGI LR8-66HGD-620M HPDC 620W 132 CEL N-TYPE BIF 23% EFIC. (LONGi Solar)",
  "1X INVERSOR 220V SAJ 3MPPT MONOFASICO 10KW R6-10K-S3-18 WIFI NEW AFCI - (SAJ)",
  "4X ESTRUTURA P/ 4 MOD. ONDULADA/FIBROMADEIRA (S/ PERFIL) (Genérico)",
  "2X CABO SOLAR 6MM VERMELHO - BOBINA 25MTS (Genérico)",
  "2X CABO SOLAR 6MM PRETO - BOBINA 25MTS (Genérico)",
  "8X CONECTOR MC4 (Genérico)",
  "16X PERFIL DE ALUMÍNIO 2,40M (Genérico)",
].join("\n");

/** Parseia kit_itens_lista (texto multiline) em array de objetos para exibição */
function parseKitItems(
  raw: string | number | undefined | null
): Array<{ label: string; description: string; price: string }> {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      if (
        lower.includes("margem") ||
        lower.includes("lucro") ||
        lower.includes("margin") ||
        lower.includes("profit")
      ) {
        return false;
      }
      return true;
    })
    .map((line) => {
      // Formato esperado: "2x Nome Produto (Marca) — R$ 1.000,00"
      const priceMatch = line.match(/—\s*(R\$[\s\d.,]+)$/);
      const price = priceMatch ? priceMatch[1].trim() : "";
      const rest = priceMatch ? line.slice(0, priceMatch.index).trim() : line;
      // Separa "2x Nome (Marca)" em quantidade+nome e marca
      const brandMatch = rest.match(/\(([^)]+)\)$/);
      const brand = brandMatch ? brandMatch[1].trim() : "";
      const label = brandMatch ? rest.slice(0, brandMatch.index).trim() : rest;
      return { label, description: brand, price };
    });
}

export type PricingBranding = {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
};

type ProposalPalette = {
  fg: string;
  cardBg: string;
  footerBg: string;
  divider: string;
  border: string;
  muted: string;
  accent: string;
};

function resolveProposalPalette(branding?: PricingBranding | null): ProposalPalette | null {
  const rawBg = branding?.backgroundColor?.trim();
  const rawText = branding?.textColor?.trim();
  const bg = !rawBg || isLegacyDarkBlue(rawBg) ? "#ffffff" : rawBg;
  const isDarkBg = getHexRelativeLuminance(bg) < 0.45;
  const text =
    !rawText || (!isDarkBg && getHexRelativeLuminance(rawText) >= 0.45)
      ? isDarkBg
        ? "#f8fafc"
        : "#022C22"
      : rawText;
  const accent = branding?.primaryColor?.trim() || "#059669";
  return {
    fg: text,
    cardBg: isDarkBg
      ? `color-mix(in srgb, ${text} 6%, ${bg})`
      : `color-mix(in srgb, ${text} 3%, ${bg})`,
    footerBg: `color-mix(in srgb, ${accent} 10%, ${bg})`,
    divider: `color-mix(in srgb, ${text} 10%, ${bg})`,
    border: `color-mix(in srgb, ${text} 14%, ${bg})`,
    muted: `color-mix(in srgb, ${text} 60%, ${bg})`,
    accent,
  };
}

export type PricingSectionPreviewProps = {
  intro: ReactNode;
  showDiscount: boolean;
  paymentConditions?: string;
  vars: PreviewRenderVariables;
  compact?: boolean;
  branding?: PricingBranding | null;
  paymentOptions?: unknown;
  mode?: "web" | "pdf";
};

export function PricingSectionPreview({
  intro,
  showDiscount,
  paymentConditions,
  vars,
  compact = false,
  branding,
  mode,
}: PricingSectionPreviewProps): JSX.Element {
  const isPdf = mode === "pdf";
  const base = parseAmount(vars, "investimento_total");
  const discountRaw = parseAmount(vars, "investimento_desconto");
  const discount = discountRaw != null ? Math.abs(discountRaw) : null;

  const effectiveShowDiscount = showDiscount && discount != null && discount > 0;

  const hasNumericBreakdown =
    base != null && effectiveShowDiscount && discount != null && discount > 0 && base > discount;
  const finalAmount = hasNumericBreakdown ? base - discount : base;

  const baseDisplay = base != null ? formatBRL(base) : String(vars.investimento_total ?? "—");
  const discountDisplay = discount != null && discount > 0 ? `− ${formatBRL(discount)}` : "";
  const totalDisplay = finalAmount != null ? formatBRL(finalAmount) : baseDisplay;

  const rowPad = compact ? "py-3.5" : "py-4";
  const cardPad = compact ? "px-4 py-1 sm:px-5" : "px-5 py-1 sm:px-6";
  const totalSize = compact ? "text-2xl sm:text-[1.75rem]" : "text-[1.65rem] sm:text-3xl";

  const paymentHtml = paymentConditions?.trim()
    ? replaceVariables(paymentConditions, vars as unknown as Record<string, string | number>).trim()
    : "";

  const rawBrandingBg = branding?.backgroundColor?.trim();
  const safeBg = !rawBrandingBg || isLegacyDarkBlue(rawBrandingBg) ? "#ffffff" : rawBrandingBg;
  const isDark = getHexRelativeLuminance(safeBg) < 0.45;
  const rawBrandingText = branding?.textColor?.trim();
  const safeText =
    !rawBrandingText || (!isDark && getHexRelativeLuminance(rawBrandingText) >= 0.45)
      ? isDark
        ? "#f8fafc"
        : "#022C22"
      : rawBrandingText;

  const effectiveBranding: PricingBranding = {
    backgroundColor: safeBg,
    textColor: safeText,
    primaryColor: branding?.primaryColor?.trim() || (isDark ? "#22c55e" : "#059669"),
    secondaryColor: branding?.secondaryColor?.trim() || (isDark ? "#34d399" : "#34D399"),
  };

  const palette = resolveProposalPalette(branding || effectiveBranding);
  const fgColor = palette?.fg ?? safeText;
  const mutedColor =
    palette?.muted ?? (isDark ? "rgba(248, 250, 252, 0.75)" : "rgba(2, 44, 34, 0.70)");

  const cardStyle: CSSProperties = palette
    ? {
        backgroundColor: palette.cardBg,
        borderColor: palette.border,
        color: palette.fg,
      }
    : {
        backgroundColor: safeBg,
        borderColor: `color-mix(in srgb, ${fgColor} 14%, ${safeBg})`,
        color: fgColor,
      };

  const rawKitList =
    typeof vars.kit_itens_lista === "string" && vars.kit_itens_lista.trim()
      ? vars.kit_itens_lista
      : vars.kit_itens_lista === undefined
        ? DEFAULT_DEMO_KIT_ITEMS
        : "";
  const kitItems = parseKitItems(rawKitList);
  const hasKitItems = kitItems.length > 0;

  return (
    <div
      className={cn("space-y-5", !palette && !isPdf && "text-[var(--color-foreground)]")}
      style={{ color: fgColor }}
    >
      {intro}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          !palette && !isPdf && "border-[var(--color-border)] bg-[var(--color-card)]",
          cardPad
        )}
        style={cardStyle}
      >
        <div
          className={cn(
            "divide-y",
            isPdf
              ? "divide-[color-mix(in_srgb,currentColor_10%,transparent)]"
              : palette
                ? "divide-[var(--palette-divider)]"
                : "divide-[var(--color-border)]"
          )}
          style={
            palette && !isPdf
              ? ({ "--palette-divider": palette.divider } as React.CSSProperties)
              : undefined
          }
        >
          {hasKitItems ? (
            // Renderiza cada item cotado pela IA
            kitItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
                  rowPad
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold uppercase leading-snug tracking-wide",
                      !palette && !isPdf && "text-[var(--color-foreground)]"
                    )}
                    style={{ color: fgColor }}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed",
                        !palette && !isPdf && "text-[var(--color-muted-foreground)]"
                      )}
                      style={{ color: mutedColor }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
                {item.price && (
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums sm:pt-0.5 sm:text-right",
                      !palette && !isPdf && "text-[var(--color-foreground)]"
                    )}
                    style={{ color: fgColor }}
                  >
                    {item.price}
                  </p>
                )}
              </div>
            ))
          ) : (
            // Fallback genérico quando não há itens da IA
            <div
              className={cn(
                "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
                rowPad,
                palette && "border-b"
              )}
              style={palette ? { borderColor: palette.divider } : undefined}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-base font-semibold leading-snug",
                    !palette && "text-[var(--color-foreground)]"
                  )}
                  style={{ color: fgColor }}
                >
                  {BASE_LINE_LABEL}
                </p>
                <p
                  className={cn(
                    "mt-1 max-w-xl text-sm leading-relaxed",
                    !palette && "text-[var(--color-muted-foreground)]"
                  )}
                  style={{ color: mutedColor }}
                >
                  {BASE_LINE_DESCRIPTION}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-base font-semibold tabular-nums sm:pt-0.5 sm:text-lg sm:text-right",
                  !palette && "text-[var(--color-foreground)]"
                )}
                style={{ color: fgColor }}
              >
                {baseDisplay}
              </p>
            </div>
          )}

          {effectiveShowDiscount ? (
            <div
              className={cn(
                "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                rowPad,
                palette && "border-b"
              )}
              style={palette ? { borderColor: palette.divider } : undefined}
            >
              <p className="text-base font-medium" style={{ color: fgColor }}>
                Desconto
              </p>
              <p
                className="shrink-0 text-base font-semibold tabular-nums sm:text-lg"
                style={{
                  color: palette?.accent ?? "var(--preview-primary-color, rgb(5, 150, 105))",
                }}
              >
                {discountDisplay}
              </p>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-0 border-t-2 px-4 py-5 sm:px-5 sm:py-6",
            !palette && !isPdf && "border-[var(--color-border)]"
          )}
          style={{
            backgroundColor:
              palette?.footerBg ??
              `color-mix(in srgb, ${effectiveBranding.primaryColor} 10%, ${safeBg})`,
            borderTopColor: palette?.border ?? `color-mix(in srgb, ${fgColor} 16%, ${safeBg})`,
            color: fgColor,
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <p
              className={cn(
                "text-sm font-bold uppercase tracking-[0.06em]",
                !palette && !isPdf && "text-[var(--color-muted-foreground)]"
              )}
              style={{ color: mutedColor }}
            >
              Total a investir
            </p>
            <p
              className={cn("font-bold leading-tight tracking-tight tabular-nums", totalSize)}
              style={{ color: fgColor }}
            >
              {totalDisplay}
            </p>
          </div>
          {hasNumericBreakdown && base != null && discount != null ? (
            <p
              className={cn(
                "mt-3 text-sm leading-relaxed",
                !palette && !isPdf && "text-[var(--color-muted-foreground)]"
              )}
              style={{ color: mutedColor }}
            >
              <span
                className="font-medium"
                style={{
                  color: palette?.accent ?? "var(--preview-primary-color, rgb(5, 150, 105))",
                }}
              >
                Economia de {formatBRL(discount)}
              </span>
              <span
                className="mx-1.5"
                style={{
                  color:
                    palette?.divider ?? (isPdf ? "rgba(2, 44, 34, 0.3)" : "var(--color-border)"),
                }}
              >
                ·
              </span>
              <span
                className="line-through"
                style={{
                  textDecorationColor: mutedColor,
                }}
              >
                {formatBRL(base)}
              </span>
              <span> antes do desconto</span>
            </p>
          ) : null}
        </div>
      </div>

      {paymentHtml ? (
        <div
          data-editor-field-path="paymentConditions"
          className={cn(
            "preview-rich-content max-w-none text-sm leading-relaxed [&_p]:my-2",
            !palette && !isPdf && "text-[var(--color-muted-foreground)]"
          )}
          style={{ color: mutedColor }}
          dangerouslySetInnerHTML={safeHtml(paymentHtml)}
        />
      ) : null}
    </div>
  );
}
