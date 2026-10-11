"use client";

import { useState, useId } from "react";
import {
  WalletCards,
  Wallet,
  CreditCard,
  Landmark,
  Check,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { ProposalPaymentOptions } from "@energivia/shared-types";
import { normalizePaymentOptions, calculateCashFinalAmount } from "@/lib/proposal-payment-utils";
import { updateProposalPaymentOptions } from "@/lib/leads-api";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ProposalPaymentOptionsCardProps {
  organizationId: string;
  proposalId: string;
  initialOptions?: ProposalPaymentOptions | null;
  totalInvestment: number;
  monthlySavings?: number | null;
  onSaved: (result: { paymentOptions: ProposalPaymentOptions; publicToken: string }) => void;
}

const COMMON_CARD_INSTALLMENTS = [1, 2, 3, 6, 10, 12, 15, 18, 21];
const COMMON_FINANCING_TERMS = [24, 36, 48, 60, 72, 84, 96, 120];
const CASH_METHOD_OPTIONS = ["Pix", "Boleto", "TED"];

export function ProposalPaymentOptionsCard({
  organizationId,
  proposalId,
  initialOptions,
  totalInvestment,
  monthlySavings,
  onSaved,
}: ProposalPaymentOptionsCardProps): JSX.Element {
  const formId = useId();
  const [options, setOptions] = useState<ProposalPaymentOptions>(() =>
    normalizePaymentOptions(initialOptions, totalInvestment)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // À Vista helpers
  const [cashDiscountType, setCashDiscountType] = useState<"brl" | "pct">(
    options.cash.discountPct && options.cash.discountPct > 0 ? "pct" : "brl"
  );

  const handleCashToggle = (enabled: boolean) => {
    setOptions((prev) => ({
      ...prev,
      cash: { ...prev.cash, enabled },
    }));
  };

  const handleCashDiscountBrlChange = (val: number | null) => {
    const nextVal = val ?? 0;
    const nextFinal = calculateCashFinalAmount(totalInvestment, nextVal, null);
    setOptions((prev) => ({
      ...prev,
      cash: {
        ...prev.cash,
        discountBrl: nextVal,
        discountPct: null,
        finalAmount: nextFinal,
      },
    }));
  };

  const handleCashDiscountPctChange = (pctStr: string) => {
    const pct = parseFloat(pctStr.replace(",", ".")) || 0;
    const nextFinal = calculateCashFinalAmount(totalInvestment, null, pct);
    setOptions((prev) => ({
      ...prev,
      cash: {
        ...prev.cash,
        discountPct: pct,
        discountBrl: null,
        finalAmount: nextFinal,
      },
    }));
  };

  const handleToggleCashMethod = (method: string) => {
    setOptions((prev) => {
      const current = prev.cash.methods || [];
      const next = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method];
      return {
        ...prev,
        cash: { ...prev.cash, methods: next.length > 0 ? next : [method] },
      };
    });
  };

  // Cartão helpers
  const handleCardToggle = (enabled: boolean) => {
    setOptions((prev) => ({
      ...prev,
      creditCard: { ...prev.creditCard, enabled },
    }));
  };

  const handleCardInstallmentsSelect = (installments: number) => {
    setOptions((prev) => {
      const prevTotal = prev.creditCard.totalAmount || totalInvestment;
      const calculatedAmt = Math.round((prevTotal / installments) * 100) / 100;
      return {
        ...prev,
        creditCard: {
          ...prev.creditCard,
          maxInstallments: installments,
          installmentAmount:
            prev.creditCard.installmentAmount > 0
              ? prev.creditCard.installmentAmount
              : calculatedAmt,
        },
      };
    });
  };

  const handleCardInstallmentAmountChange = (amt: number | null) => {
    const safeAmt = amt ?? 0;
    setOptions((prev) => ({
      ...prev,
      creditCard: {
        ...prev.creditCard,
        installmentAmount: safeAmt,
        totalAmount: Math.round(safeAmt * prev.creditCard.maxInstallments * 100) / 100,
      },
    }));
  };

  // Financiamento helpers
  const handleFinancingToggle = (enabled: boolean) => {
    setOptions((prev) => ({
      ...prev,
      financing: { ...prev.financing, enabled },
    }));
  };

  const handleFinancingTermSelect = (terms: number) => {
    setOptions((prev) => {
      const approxFinanced = totalInvestment - (prev.financing.downPaymentBrl || 0);
      const calculatedAmt = terms > 0 ? Math.round((approxFinanced / terms) * 100) / 100 : 0;
      return {
        ...prev,
        financing: {
          ...prev.financing,
          installments: terms,
          installmentAmount:
            prev.financing.installmentAmount > 0 ? prev.financing.installmentAmount : calculatedAmt,
        },
      };
    });
  };

  const handleFinancingInstallmentAmountChange = (amt: number | null) => {
    const safeAmt = amt ?? 0;
    setOptions((prev) => ({
      ...prev,
      financing: {
        ...prev.financing,
        installmentAmount: safeAmt,
      },
    }));
  };

  const atLeastOneEnabled =
    options.cash.enabled || options.creditCard.enabled || options.financing.enabled;

  const handleSave = async () => {
    if (!atLeastOneEnabled) {
      setError("Ative pelo menos uma forma de pagamento.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await updateProposalPaymentOptions(organizationId, proposalId, options);
      setSuccessMsg("Condições de pagamento salvas com sucesso!");
      onSaved(res);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar formas de pagamento.");
    } finally {
      setSaving(false);
    }
  };

  // Diferença financeira para Financiamento
  const netFinancingDifference =
    (monthlySavings ?? 0) > 0 && options.financing.installmentAmount > 0
      ? (monthlySavings ?? 0) - options.financing.installmentAmount
      : null;

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6 shadow-sm"
      aria-label="Condições e formas de pagamento"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Condições & Formas de Pagamento
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Defina as opções exibidas ao cliente. Insira diretamente os valores reais que você
              calculou na maquininha ou banco parceiro.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={saving || !atLeastOneEnabled}
          onClick={() => void handleSave()}
          className="bg-emerald-600 text-white hover:bg-emerald-700 h-9 px-4 text-xs font-semibold shrink-0"
        >
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Salvar condições
        </Button>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ==================== 1. À VISTA ==================== */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            options.cash.enabled
              ? "border-[var(--color-border)] bg-[var(--color-background)]/60"
              : "border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 opacity-60"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  À Vista
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={options.cash.enabled}
                  onChange={(e) => handleCashToggle(e.target.checked)}
                />
                <div className="h-5 w-9 rounded-full bg-zinc-300 peer-checked:bg-emerald-600 peer-focus:outline-none dark:bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {options.cash.enabled ? (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Desconto à vista
                    </label>
                    <div className="flex rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCashDiscountType("brl")}
                        className={`rounded px-1.5 py-0.5 font-medium transition ${
                          cashDiscountType === "brl"
                            ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-xs"
                            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashDiscountType("pct")}
                        className={`rounded px-1.5 py-0.5 font-medium transition ${
                          cashDiscountType === "pct"
                            ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-xs"
                            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5">
                    {cashDiscountType === "brl" ? (
                      <CurrencyInput
                        id={`${formId}-cash-discount-brl`}
                        value={options.cash.discountBrl ?? 0}
                        onValueChange={handleCashDiscountBrlChange}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={options.cash.discountPct ? String(options.cash.discountPct) : ""}
                          onChange={(e) => handleCashDiscountPctChange(e.target.value)}
                          placeholder="5"
                          className="h-9"
                        />
                        <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--color-muted)]/30 p-2.5">
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    Valor líquido à vista
                  </span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatBRL(options.cash.finalAmount)}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                    Meios aceitos
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {CASH_METHOD_OPTIONS.map((m) => {
                      const active = (options.cash.methods || []).includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleToggleCashMethod(m)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                            active
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/30"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                Opção desabilitada nesta proposta.
              </p>
            )}
          </div>
        </div>

        {/* ==================== 2. CARTÃO DE CRÉDITO ==================== */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            options.creditCard.enabled
              ? "border-[var(--color-border)] bg-[var(--color-background)]/60"
              : "border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 opacity-60"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  Cartão de Crédito
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={options.creditCard.enabled}
                  onChange={(e) => handleCardToggle(e.target.checked)}
                />
                <div className="h-5 w-9 rounded-full bg-zinc-300 peer-checked:bg-blue-600 peer-focus:outline-none dark:bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {options.creditCard.enabled ? (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Máximo de parcelas
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {COMMON_CARD_INSTALLMENTS.map((n) => {
                      const isSel = options.creditCard.maxInstallments === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleCardInstallmentsSelect(n)}
                          className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                            isSel
                              ? "bg-blue-600 text-white font-semibold shadow-xs"
                              : "border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                          }`}
                        >
                          {n}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Valor da parcela real (R$)
                  </label>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mb-1">
                    Insira o valor exato calculado na sua maquininha
                  </p>
                  <CurrencyInput
                    id={`${formId}-card-installment`}
                    value={options.creditCard.installmentAmount}
                    onValueChange={handleCardInstallmentAmountChange}
                  />
                </div>

                <div className="rounded-lg bg-[var(--color-muted)]/30 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      Total a prazo ({options.creditCard.maxInstallments}x)
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      com encargos
                    </span>
                  </div>
                  <p className="text-base font-bold text-[var(--color-foreground)] tabular-nums mt-0.5">
                    {formatBRL(
                      options.creditCard.totalAmount ||
                        options.creditCard.installmentAmount * options.creditCard.maxInstallments
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                    Nota / Condição da maquininha
                  </label>
                  <Input
                    type="text"
                    value={options.creditCard.taxDescription || ""}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        creditCard: { ...prev.creditCard, taxDescription: e.target.value },
                      }))
                    }
                    placeholder="Ex: Em até 2 cartões de crédito"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                Opção desabilitada nesta proposta.
              </p>
            )}
          </div>
        </div>

        {/* ==================== 3. FINANCIAMENTO ==================== */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            options.financing.enabled
              ? "border-[var(--color-border)] bg-[var(--color-background)]/60"
              : "border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 opacity-60"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  Financiamento Solar
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={options.financing.enabled}
                  onChange={(e) => handleFinancingToggle(e.target.checked)}
                />
                <div className="h-5 w-9 rounded-full bg-zinc-300 peer-checked:bg-emerald-600 peer-focus:outline-none dark:bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {options.financing.enabled ? (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Prazo em meses
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {COMMON_FINANCING_TERMS.map((t) => {
                      const isSel = options.financing.installments === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleFinancingTermSelect(t)}
                          className={`rounded px-1.5 py-0.5 text-xs font-medium transition ${
                            isSel
                              ? "bg-emerald-600 text-white font-semibold shadow-xs"
                              : "border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                          }`}
                        >
                          {t}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Valor da parcela bancária (R$)
                  </label>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mb-1">
                    Insira a parcela real da simulação do banco parceiro
                  </p>
                  <CurrencyInput
                    id={`${formId}-financing-installment`}
                    value={options.financing.installmentAmount}
                    onValueChange={handleFinancingInstallmentAmountChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Entrada (R$)
                    </label>
                    <CurrencyInput
                      id={`${formId}-financing-downpayment`}
                      value={options.financing.downPaymentBrl ?? 0}
                      onValueChange={(val) =>
                        setOptions((prev) => ({
                          ...prev,
                          financing: { ...prev.financing, downPaymentBrl: val ?? 0 },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Carência (dias)
                    </label>
                    <Input
                      type="number"
                      value={options.financing.graceDays ?? 90}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          financing: {
                            ...prev.financing,
                            graceDays: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {netFinancingDifference !== null && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Energia que se paga</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-emerald-950 dark:text-emerald-100">
                      Economia estimada de <strong>{formatBRL(monthlySavings ?? 0)}/mês</strong>{" "}
                      cobre a parcela de{" "}
                      <strong>{formatBRL(options.financing.installmentAmount)}/mês</strong>
                      {netFinancingDifference > 0 ? (
                        <>
                          {" "}
                          (sobra líquida de <strong>{formatBRL(netFinancingDifference)}/mês</strong>
                          )
                        </>
                      ) : null}
                      .
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                Opção desabilitada nesta proposta.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
