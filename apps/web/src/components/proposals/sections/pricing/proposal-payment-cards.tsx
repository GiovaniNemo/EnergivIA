import type { ReactNode } from "react";
import { Wallet, CreditCard, Landmark, Check, TrendingUp } from "lucide-react";
import type { ProposalPaymentOptions } from "@energivia/shared-types";

function formatBRL(value: number | null | undefined): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ProposalPaymentCardsProps {
  paymentOptions: ProposalPaymentOptions;
  monthlySavings?: number | null;
  mode?: "web" | "pdf";
  sectionTitle?: ReactNode;
  sectionDescription?: ReactNode;
  branding?: {
    primaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
    secondaryColor?: string;
  } | null;
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
  let gridColsClass = "grid-cols-1 md:grid-cols-3";
  if (enabledCount === 2) gridColsClass = isPdf ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2";
  if (enabledCount === 1) gridColsClass = "grid-cols-1 max-w-md mx-auto";
  if (isPdf && enabledCount === 3) gridColsClass = "grid-cols-3";

  const primaryColor = branding?.primaryColor || "#059669";

  return (
    <div className="w-full space-y-4 break-inside-avoid">
      <div className="flex items-center justify-between">
        <div>
          <h3
            data-editor-field-path="title"
            className="preview-editable-target text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]"
          >
            {sectionTitle || "Condições & Formas de Pagamento"}
          </h3>
          <div
            data-editor-field-path="text"
            className="preview-editable-target mt-0.5 text-xs text-[var(--color-muted-foreground)]"
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
            className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/90 p-4 sm:p-5 shadow-xs transition-all break-inside-avoid"
            style={{
              borderColor: "var(--color-border)",
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, transparent)`,
                      color: primaryColor,
                    }}
                  >
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-foreground)]">À Vista</h4>
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Investimento direto
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`,
                    color: primaryColor,
                  }}
                >
                  Maior economia
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Valor final à vista
                </span>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[var(--color-foreground)] tabular-nums">
                  {formatBRL(cash.finalAmount)}
                </p>

                {(cash.discountBrl && cash.discountBrl > 0) ||
                (cash.discountPct && cash.discountPct > 0) ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Desconto de{" "}
                    {cash.discountBrl && cash.discountBrl > 0
                      ? formatBRL(cash.discountBrl)
                      : `${cash.discountPct}%`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3">
              <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                Formas aceitas:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(cash.methods && cash.methods.length > 0
                  ? cash.methods
                  : ["Pix", "Boleto", "TED"]
                ).map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1 rounded border border-[var(--color-border)]/70 bg-[var(--color-muted)]/30 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-foreground)]"
                  >
                    <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                    {method}
                  </span>
                ))}
              </div>
              {cash.notes ? (
                <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)] leading-tight">
                  {cash.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ==================== 2. CARTÃO DE CRÉDITO ==================== */}
        {creditCard?.enabled && (
          <div
            className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/90 p-4 sm:p-5 shadow-xs transition-all break-inside-avoid"
            style={{
              borderColor: "var(--color-border)",
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-foreground)]">
                      Cartão de Crédito
                    </h4>
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Parcelamento facilitado
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  Até {creditCard.maxInstallments}x
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Parcelas mensais
                </span>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[var(--color-foreground)] tabular-nums">
                  {creditCard.maxInstallments}x de{" "}
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatBRL(creditCard.installmentAmount)}
                  </span>
                </p>

                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Total a prazo:{" "}
                  <strong className="text-[var(--color-foreground)] font-semibold">
                    {formatBRL(
                      creditCard.totalAmount ||
                        creditCard.installmentAmount * creditCard.maxInstallments
                    )}
                  </strong>
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3">
              <p className="text-[11px] text-[var(--color-muted-foreground)] leading-tight">
                {creditCard.taxDescription || "Taxa da maquininha inclusa"}
              </p>
              {creditCard.notes ? (
                <p className="mt-1.5 text-[10px] text-[var(--color-muted-foreground)]">
                  {creditCard.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ==================== 3. FINANCIAMENTO SOLAR ==================== */}
        {financing?.enabled && (
          <div
            className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/90 p-4 sm:p-5 shadow-xs transition-all break-inside-avoid"
            style={{
              borderColor: "var(--color-border)",
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, transparent)`,
                      color: primaryColor,
                    }}
                  >
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-foreground)]">
                      Financiamento Solar
                    </h4>
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      {financing.bankName || "Bancos parceiros"}
                    </span>
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`,
                    color: primaryColor,
                  }}
                >
                  {financing.installments} meses
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  Parcela estimada
                </span>
                <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[var(--color-foreground)] tabular-nums">
                  {financing.installments}x de{" "}
                  <span style={{ color: primaryColor }}>
                    {formatBRL(financing.installmentAmount)}
                  </span>
                </p>

                {(monthlySavings ?? 0) > 0 && financing.installmentAmount > 0 && (
                  <div
                    className="mt-2.5 flex items-start gap-1.5 rounded-lg p-2 text-[11px] leading-tight"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                      color: "var(--color-foreground)",
                      borderColor: `color-mix(in srgb, ${primaryColor} 25%, transparent)`,
                    }}
                  >
                    <TrendingUp
                      className="h-3.5 w-3.5 shrink-0 mt-0.5"
                      style={{ color: primaryColor }}
                    />
                    <span>
                      Sua economia de <strong>{formatBRL(monthlySavings ?? 0)}/mês</strong> paga a
                      parcela!
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3 text-[10px] text-[var(--color-muted-foreground)] space-y-1">
              <div className="flex items-center justify-between">
                <span>Entrada:</span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {financing.downPaymentBrl && financing.downPaymentBrl > 0
                    ? formatBRL(financing.downPaymentBrl)
                    : "R$ 0,00 (100% financiado)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>1ª Parcela:</span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  Em até {financing.graceDays || 90} dias
                </span>
              </div>
              <p className="pt-1 text-[9px] text-[var(--color-muted-foreground)]/80 italic">
                *Sujeito à análise e aprovação de crédito da instituição.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
