import type { ReactNode } from "react";
import { Wallet, CreditCard, Landmark, Check, TrendingUp } from "lucide-react";
import type { ProposalPaymentOptions } from "@energivia/shared-types";

function formatBRL(value: number | null | undefined): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function withAlpha(color: string, alpha: number): string {
  const normalized = (color || "").trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `color-mix(in srgb, ${normalized || "#000000"} ${Math.round(alpha * 100)}%, transparent)`;
  }
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseHexRgb(color: string): { r: number; g: number; b: number } | null {
  const normalized = (color || "").trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getLuminance(color: string, fallbackIsLight = true): number {
  const rgb = parseHexRgb(color);
  if (!rgb) return fallbackIsLight ? 0.9 : 0.1;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export interface PaymentCardsBranding {
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  secondaryColor?: string;
}

function resolvePaymentCardsPalette(branding?: PaymentCardsBranding | null) {
  const rawBg = branding?.backgroundColor?.trim() || "";
  const rawText = branding?.textColor?.trim() || "";
  const bgLuminance = rawBg ? getLuminance(rawBg, true) : 1;
  const textLuminance = rawText ? getLuminance(rawText, false) : 0;

  // Determina se o fundo é escuro ou claro pelo contraste percebido
  const isDark = rawBg ? bgLuminance < 0.5 : textLuminance > 0.6;

  const primary = branding?.primaryColor?.trim() || "#059669";
  const secondary = branding?.secondaryColor?.trim() || "#34d399";
  const text = rawText || (isDark ? "#f8fafc" : "#022c22");
  const background = rawBg || (isDark ? "#090d14" : "#ffffff");

  const textMuted = withAlpha(text, isDark ? 0.72 : 0.68);
  const textSubtle = withAlpha(text, isDark ? 0.5 : 0.46);

  // Cards: em tema claro, fundo branco limpo com leve chanfro e sombra suave;
  // em tema escuro, superfície elevada sutil
  const cardBg = isDark ? `color-mix(in srgb, ${text} 6%, ${background})` : "#ffffff";
  const cardBorder = withAlpha(text, isDark ? 0.12 : 0.1);
  const cardShadow = isDark
    ? "0 8px 30px -4px rgba(0, 0, 0, 0.45)"
    : "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)";

  const divider = withAlpha(text, isDark ? 0.1 : 0.08);

  // Pills (Pix, Boleto, TED)
  const pillBg = withAlpha(text, isDark ? 0.06 : 0.04);
  const pillBorder = withAlpha(text, isDark ? 0.14 : 0.11);
  const pillText = text;

  // Badges e Ícones principais
  const primaryBadgeBg = withAlpha(primary, isDark ? 0.2 : 0.12);
  const primaryIconBg = withAlpha(primary, isDark ? 0.18 : 0.1);

  // Acentos de Cartão de Crédito com alto contraste garantido
  const creditCardAccent = {
    iconBg: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.09)",
    iconColor: isDark ? "#60a5fa" : "#1d4ed8",
    badgeBg: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.09)",
    badgeText: isDark ? "#93c5fd" : "#1d4ed8",
    amountColor: isDark ? "#60a5fa" : "#1d4ed8",
  };

  // Caixa de destaque da economia mensal
  const highlightBox = {
    bg: isDark ? withAlpha(primary, 0.14) : `color-mix(in srgb, ${primary} 9%, #ffffff)`,
    border: withAlpha(primary, isDark ? 0.32 : 0.25),
    text: text,
    iconColor: isDark ? "#34d399" : primary,
  };

  const discountColor = isDark ? "#34d399" : "#059669";

  return {
    isDark,
    primary,
    secondary,
    text,
    textMuted,
    textSubtle,
    background,
    cardBg,
    cardBorder,
    cardShadow,
    divider,
    pillBg,
    pillBorder,
    pillText,
    primaryBadgeBg,
    primaryIconBg,
    creditCardAccent,
    highlightBox,
    discountColor,
  };
}

export interface ProposalPaymentCardsProps {
  paymentOptions: ProposalPaymentOptions;
  monthlySavings?: number | null;
  mode?: "web" | "pdf";
  sectionTitle?: ReactNode;
  sectionDescription?: ReactNode;
  branding?: PaymentCardsBranding | null;
}

export function ProposalPaymentCards({
  paymentOptions,
  monthlySavings,
  mode = "web",
  sectionTitle,
  sectionDescription,
  branding,
}: ProposalPaymentCardsProps): JSX.Element | null {
  const { cash, creditCard, financing } = paymentOptions;

  const enabledCount = [cash?.enabled, creditCard?.enabled, financing?.enabled].filter(
    Boolean
  ).length;
  if (enabledCount === 0) return null;

  const isPdf = mode === "pdf";

  // Grid responsiveness
  let gridColsClass = "proposal-payment-cards-grid has-3-cards";
  if (enabledCount === 2)
    gridColsClass = isPdf ? "grid-cols-2" : "proposal-payment-cards-grid has-2-cards";
  if (enabledCount === 1) gridColsClass = "grid-cols-1 max-w-md mx-auto";
  if (isPdf && enabledCount === 3) gridColsClass = "grid-cols-3";

  const palette = resolvePaymentCardsPalette(branding);

  return (
    <div className="w-full space-y-4 break-inside-avoid">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3
            data-editor-field-path="title"
            className="preview-editable-target text-base sm:text-lg font-bold tracking-tight uppercase"
            style={{ color: palette.text }}
          >
            {sectionTitle || "Condições & Formas de Pagamento"}
          </h3>
          <div
            data-editor-field-path="text"
            className="preview-editable-target mt-0.5 text-xs sm:text-sm"
            style={{ color: palette.textMuted }}
          >
            {sectionDescription || (
              <span>Escolha a modalidade que melhor se adapta ao seu planejamento financeiro.</span>
            )}
          </div>
        </div>
      </div>

      <div className={`grid gap-3.5 sm:gap-4 ${gridColsClass}`}>
        {/* ==================== 1. À VISTA ==================== */}
        {cash?.enabled && (
          <div
            className="flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all break-inside-avoid"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              boxShadow: palette.cardShadow,
              color: palette.text,
            }}
          >
            <div>
              <div
                className="flex items-center justify-between gap-2 border-b pb-3"
                style={{ borderBottomColor: palette.divider }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: palette.primaryIconBg,
                      color: palette.primary,
                    }}
                  >
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: palette.text }}>
                      À Vista
                    </h4>
                    <span className="text-[10px]" style={{ color: palette.textMuted }}>
                      Investimento direto
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    backgroundColor: palette.primaryBadgeBg,
                    color: palette.primary,
                  }}
                >
                  Maior economia
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium" style={{ color: palette.textMuted }}>
                  Valor final à vista
                </span>
                <p
                  className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums"
                  style={{ color: palette.text }}
                >
                  {formatBRL(cash.finalAmount)}
                </p>

                {(cash.discountBrl && cash.discountBrl > 0) ||
                (cash.discountPct && cash.discountPct > 0) ? (
                  <p
                    className="mt-1 text-xs font-semibold"
                    style={{ color: palette.discountColor }}
                  >
                    Desconto de{" "}
                    {cash.discountBrl && cash.discountBrl > 0
                      ? formatBRL(cash.discountBrl)
                      : `${cash.discountPct}%`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 border-t pt-3" style={{ borderTopColor: palette.divider }}>
              <span className="text-[10px] font-medium" style={{ color: palette.textMuted }}>
                Formas aceitas:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(cash.methods && cash.methods.length > 0
                  ? cash.methods
                  : ["Pix", "Boleto", "TED"]
                ).map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: palette.pillBg,
                      borderColor: palette.pillBorder,
                      color: palette.pillText,
                    }}
                  >
                    <Check className="h-2.5 w-2.5" style={{ color: palette.discountColor }} />
                    {method}
                  </span>
                ))}
              </div>
              {cash.notes ? (
                <p className="mt-2 text-[10px] leading-tight" style={{ color: palette.textMuted }}>
                  {cash.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ==================== 2. CARTÃO DE CRÉDITO ==================== */}
        {creditCard?.enabled && (
          <div
            className="flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all break-inside-avoid"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              boxShadow: palette.cardShadow,
              color: palette.text,
            }}
          >
            <div>
              <div
                className="flex items-center justify-between gap-2 border-b pb-3"
                style={{ borderBottomColor: palette.divider }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: palette.creditCardAccent.iconBg,
                      color: palette.creditCardAccent.iconColor,
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: palette.text }}>
                      Cartão de Crédito
                    </h4>
                    <span className="text-[10px]" style={{ color: palette.textMuted }}>
                      Parcelamento facilitado
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: palette.creditCardAccent.badgeBg,
                    color: palette.creditCardAccent.badgeText,
                  }}
                >
                  Até {creditCard.maxInstallments}x
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium" style={{ color: palette.textMuted }}>
                  Parcelas mensais
                </span>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">
                  <span style={{ color: palette.text }}>{creditCard.maxInstallments}x de </span>
                  <span style={{ color: palette.creditCardAccent.amountColor }}>
                    {formatBRL(creditCard.installmentAmount)}
                  </span>
                </p>

                <p className="mt-1 text-xs" style={{ color: palette.textMuted }}>
                  Total a prazo:{" "}
                  <strong className="font-semibold" style={{ color: palette.text }}>
                    {formatBRL(
                      creditCard.totalAmount ||
                        creditCard.installmentAmount * creditCard.maxInstallments
                    )}
                  </strong>
                </p>
              </div>
            </div>

            <div className="mt-5 border-t pt-3" style={{ borderTopColor: palette.divider }}>
              <p className="text-[11px] leading-tight" style={{ color: palette.textMuted }}>
                {creditCard.taxDescription || "Taxa da maquininha inclusa"}
              </p>
              {creditCard.notes ? (
                <p className="mt-1.5 text-[10px]" style={{ color: palette.textMuted }}>
                  {creditCard.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ==================== 3. FINANCIAMENTO SOLAR ==================== */}
        {financing?.enabled && (
          <div
            className="flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all break-inside-avoid"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              boxShadow: palette.cardShadow,
              color: palette.text,
            }}
          >
            <div>
              <div
                className="flex items-center justify-between gap-2 border-b pb-3"
                style={{ borderBottomColor: palette.divider }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: palette.primaryIconBg,
                      color: palette.primary,
                    }}
                  >
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: palette.text }}>
                      Financiamento Solar
                    </h4>
                    <span className="text-[10px]" style={{ color: palette.textMuted }}>
                      {financing.bankName || "Bancos parceiros"}
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: palette.primaryBadgeBg,
                    color: palette.primary,
                  }}
                >
                  {financing.installments} meses
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium" style={{ color: palette.textMuted }}>
                  Parcela estimada
                </span>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">
                  <span style={{ color: palette.text }}>{financing.installments}x de </span>
                  <span style={{ color: palette.primary }}>
                    {formatBRL(financing.installmentAmount)}
                  </span>
                </p>

                {(monthlySavings ?? 0) > 0 &&
                  financing.installmentAmount > 0 &&
                  (() => {
                    const savings = monthlySavings ?? 0;
                    const installment = financing.installmentAmount;
                    const netDiff = savings - installment;
                    const isPositive = netDiff >= 0;
                    return (
                      <div
                        className="mt-3 rounded-xl border p-3 text-[11px] leading-tight space-y-2 shadow-2xs"
                        style={{
                          backgroundColor: palette.highlightBox.bg,
                          borderColor: palette.highlightBox.border,
                          color: palette.highlightBox.text,
                        }}
                      >
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider">
                          <span
                            className="flex items-center gap-1.5"
                            style={{ color: palette.highlightBox.iconColor }}
                          >
                            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                            Substituição Inteligente
                          </span>
                          {isPositive ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold border"
                              style={{
                                backgroundColor: palette.primaryBadgeBg,
                                borderColor: palette.highlightBox.border,
                                color: palette.primary,
                              }}
                            >
                              Fluxo Positivo
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="grid grid-cols-2 gap-2 pt-1.5 border-t border-dashed"
                          style={{ borderTopColor: palette.divider }}
                        >
                          <div>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: palette.textMuted }}
                            >
                              Economia na fatura:
                            </span>
                            <p
                              className="font-extrabold text-xs tabular-nums"
                              style={{ color: palette.primary }}
                            >
                              +{formatBRL(savings)}
                            </p>
                          </div>
                          <div>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: palette.textMuted }}
                            >
                              Parcela bancária:
                            </span>
                            <p
                              className="font-extrabold text-xs tabular-nums"
                              style={{ color: palette.text }}
                            >
                              -{formatBRL(installment)}
                            </p>
                          </div>
                        </div>

                        <div
                          className="rounded-lg p-2 flex items-center justify-between border"
                          style={{
                            backgroundColor: palette.cardBg,
                            borderColor: palette.cardBorder,
                          }}
                        >
                          <span className="font-bold text-[10px]" style={{ color: palette.text }}>
                            {isPositive
                              ? "Sobra líquida no bolso:"
                              : "Investimento mensal líquido:"}
                          </span>
                          <span
                            className="font-black text-xs tabular-nums"
                            style={{ color: isPositive ? palette.primary : palette.text }}
                          >
                            {isPositive
                              ? `+${formatBRL(netDiff)}/mês`
                              : `${formatBRL(Math.abs(netDiff))}/mês`}
                          </span>
                        </div>

                        <p
                          className="text-[10px] leading-snug"
                          style={{ color: palette.textMuted }}
                        >
                          {isPositive
                            ? "Você não desembolsa do salário: a própria economia na luz quita a parcela e ainda sobra troco todo mês."
                            : "A economia na fatura cobre a maior parte da parcela, transformando despesa contínua em patrimônio."}
                        </p>
                      </div>
                    );
                  })()}
              </div>
            </div>

            <div
              className="mt-5 border-t pt-3 text-[10px] space-y-1"
              style={{ borderTopColor: palette.divider }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: palette.textMuted }}>Entrada:</span>
                <span className="font-semibold" style={{ color: palette.text }}>
                  {financing.downPaymentBrl && financing.downPaymentBrl > 0
                    ? formatBRL(financing.downPaymentBrl)
                    : "R$ 0,00 (100% financiado)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: palette.textMuted }}>1ª Parcela:</span>
                <span className="font-semibold" style={{ color: palette.text }}>
                  Em até {financing.graceDays || 90} dias
                </span>
              </div>
              <p className="pt-1 text-[9px] italic" style={{ color: palette.textSubtle }}>
                *Sujeito à análise e aprovação de crédito da instituição.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
