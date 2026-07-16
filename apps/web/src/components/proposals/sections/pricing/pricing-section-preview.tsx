"use client";

import type { CSSProperties, ReactNode } from "react";
import { parseMoneyLike, replaceVariables } from "@/components/proposals/editor/utils";
import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";
import { cn } from "@energivia/utils";

function formatBRL(n: number): string {
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
  if (!branding?.textColor?.trim() || !branding?.backgroundColor?.trim()) return null;
  const textColor = branding.textColor.trim();
  const backgroundColor = branding.backgroundColor.trim();
  const accent = branding.primaryColor?.trim() || "#059669";
  return {
    fg: textColor,
    cardBg: `color-mix(in srgb, ${textColor} 5%, ${backgroundColor})`,
    footerBg: `color-mix(in srgb, ${accent} 12%, ${backgroundColor})`,
    divider: `color-mix(in srgb, ${textColor} 11%, ${backgroundColor})`,
    border: `color-mix(in srgb, ${textColor} 16%, ${backgroundColor})`,
    muted: `color-mix(in srgb, ${textColor} 50%, ${backgroundColor})`,
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
};

export function PricingSectionPreview({
  intro,
  showDiscount,
  paymentConditions,
  vars,
  compact = false,
  branding,
}: PricingSectionPreviewProps): JSX.Element {
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

  const palette = resolveProposalPalette(branding);

  const cardStyle: CSSProperties | undefined = palette
    ? {
        backgroundColor: palette.cardBg,
        borderColor: palette.border,
        color: palette.fg,
      }
    : undefined;

  return (
    <div
      className={cn("space-y-5", !palette && "text-[var(--color-foreground)]")}
      style={palette ? { color: palette.fg } : undefined}
    >
      {intro}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          !palette && "border-[var(--color-border)] bg-[var(--color-card)]",
          cardPad
        )}
        style={cardStyle}
      >
        <div className={palette ? "" : "divide-y divide-[var(--color-border)]"}>
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
              >
                {BASE_LINE_LABEL}
              </p>
              <p
                className={cn(
                  "mt-1 max-w-xl text-sm leading-relaxed",
                  !palette && "text-[var(--color-muted-foreground)]"
                )}
                style={palette ? { color: palette.muted } : undefined}
              >
                {BASE_LINE_DESCRIPTION}
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 text-base font-semibold tabular-nums sm:pt-0.5 sm:text-lg sm:text-right",
                !palette && "text-[var(--color-foreground)]"
              )}
            >
              {baseDisplay}
            </p>
          </div>

          {effectiveShowDiscount ? (
            <div
              className={cn(
                "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                rowPad,
                palette && "border-b"
              )}
              style={palette ? { borderColor: palette.divider } : undefined}
            >
              <p className="text-base font-medium">Desconto</p>
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
            !palette && "border-[var(--color-border)]"
          )}
          style={
            palette
              ? {
                  backgroundColor: palette.footerBg,
                  borderTopColor: palette.border,
                  color: palette.fg,
                }
              : undefined
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <p
              className={cn(
                "text-sm font-bold uppercase tracking-[0.06em]",
                !palette && "text-[var(--color-muted-foreground)]"
              )}
              style={palette ? { color: palette.muted } : undefined}
            >
              Total a investir
            </p>
            <p className={cn("font-bold leading-tight tracking-tight tabular-nums", totalSize)}>
              {totalDisplay}
            </p>
          </div>
          {hasNumericBreakdown && base != null && discount != null ? (
            <p
              className={cn(
                "mt-3 text-sm leading-relaxed",
                !palette && "text-[var(--color-muted-foreground)]"
              )}
              style={palette ? { color: palette.muted } : undefined}
            >
              <span
                className="font-medium"
                style={{
                  color: palette?.accent ?? "var(--preview-primary-color, rgb(5, 150, 105))",
                }}
              >
                Economia de {formatBRL(discount)}
              </span>
              <span className="mx-1.5" style={{ color: palette?.divider ?? "var(--color-border)" }}>
                ·
              </span>
              <span
                className="line-through"
                style={{
                  textDecorationColor: palette?.muted ?? "var(--color-muted-foreground)",
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
            !palette && "text-[var(--color-muted-foreground)]"
          )}
          style={palette ? { color: palette.muted } : undefined}
          dangerouslySetInnerHTML={{ __html: paymentHtml }}
        />
      ) : null}
    </div>
  );
}
