"use client";

import { useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Tag, AlertTriangle, Loader2, X, ShieldCheck } from "lucide-react";

interface PaymentFormProps {
  planId: string;
  planName?: string;
  planPrice?: number;
  buttonText?: string;
  className?: string;
}

interface AppliedCoupon {
  code: string;
  discountType: "percent" | "amount";
  discountValue: number;
  duration: string;
  message: string;
  isLifetimeAdmin?: boolean;
  isPlusExclusive?: boolean;
}

export default function PaymentForm({
  planId,
  planName,
  planPrice,
  buttonText,
  className,
}: PaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentOrganization } = useOrganization();

  // Coupon state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/proxy/stripe/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          planId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || "Cupom inválido ou expirado.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
        setCouponError(null);
      }
    } catch {
      setCouponError("Erro ao validar cupom.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!currentOrganization) {
      setError("Usuário não está associado a uma organização/tenant.");
      setLoading(false);
      return;
    }

    try {
      const effectiveCoupon = appliedCoupon?.code || couponCode.trim();
      const upperCoupon = effectiveCoupon.toUpperCase();

      // Se for o cupom especial de admin V1T4L1C10 ou VITALICIOADMINS, ativa diretamente sem redirecionar para o Stripe
      if (
        appliedCoupon?.isLifetimeAdmin ||
        upperCoupon === "V1T4L1C10" ||
        upperCoupon === "VITALICIOADMINS"
      ) {
        const redeemRes = await fetch("/api/proxy/stripe/redeem-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: upperCoupon === "VITALICIOADMINS" ? "VITALICIOADMINS" : "V1T4L1C10",
            tenantId: currentOrganization.id,
          }),
        });

        if (!redeemRes.ok) {
          const errData = await redeemRes.json().catch(() => ({}));
          throw new Error(errData.message || "Erro ao ativar cupom administrativo.");
        }

        window.location.href = "/gestao/meus-planos?session_id=admin_lifetime_success";
        return;
      }

      const returnUrl = typeof window !== "undefined" ? window.location.origin : undefined;

      const response = await fetch("/api/proxy/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          tenantId: currentOrganization.id,
          returnUrl,
          couponCode: effectiveCoupon || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao iniciar assinatura");
      }

      const { url } = await response.json();

      // Redireciona o usuário para a página de Checkout segura do Stripe
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL de checkout não retornada pelo servidor.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao comunicar com o servidor.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate discounted price for display if planPrice is passed
  let discountedFirstPrice: number | null = null;
  if (planPrice && appliedCoupon) {
    if (appliedCoupon.isLifetimeAdmin) {
      discountedFirstPrice = 0;
    } else if (appliedCoupon.discountType === "percent") {
      discountedFirstPrice = Math.max(0, planPrice * (1 - appliedCoupon.discountValue / 100));
    } else {
      discountedFirstPrice = Math.max(0, planPrice - appliedCoupon.discountValue);
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* COUPON SECTION */}
      {!appliedCoupon && !showCouponInput ? (
        <button
          type="button"
          onClick={() => setShowCouponInput(true)}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5 mx-auto py-1"
        >
          <Tag className="w-3.5 h-3.5" />
          Possui um cupom de desconto?
        </button>
      ) : !appliedCoupon && showCouponInput ? (
        <form onSubmit={handleApplyCoupon} className="space-y-1.5 animate-in fade-in duration-200">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Digite o código (ex: PROMO20)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
            >
              {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCouponInput(false);
                setCouponError(null);
              }}
              className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-xs"
            >
              ✕
            </button>
          </div>
          {couponError && (
            <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {couponError}
            </p>
          )}
        </form>
      ) : appliedCoupon ? (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-emerald-300">
                  {appliedCoupon.code}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                  {appliedCoupon.isLifetimeAdmin
                    ? "Vitalício Admin"
                    : appliedCoupon.duration === "once"
                      ? "1ª Parcela"
                      : "Ativo"}
                </span>
                {appliedCoupon.isPlusExclusive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase border border-purple-500/30">
                    Exclusivo PLUS
                  </span>
                )}
              </div>
              {appliedCoupon.isLifetimeAdmin ? (
                <p className="text-[11px] text-emerald-400 font-bold">
                  Acesso Ilimitado • Sem Cartão
                </p>
              ) : (
                discountedFirstPrice !== null && (
                  <p className="text-[11px] text-emerald-400 font-bold">
                    1ª parcela: R$ {discountedFirstPrice.toFixed(2)}{" "}
                    <span className="line-through opacity-60 font-normal text-[10px]">
                      R$ {planPrice?.toFixed(2)}
                    </span>
                  </p>
                )
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveCoupon}
            className="text-[var(--color-muted-foreground)] hover:text-red-400 p-1 transition"
            title="Remover cupom"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      {/* CHECKOUT FORM */}
      <form onSubmit={handleSubmit} className="space-y-3 w-full">
        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={
            appliedCoupon?.isLifetimeAdmin
              ? "w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
              : className ||
                "w-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          }
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {appliedCoupon?.isLifetimeAdmin
                ? "Ativando Acesso Vitalício..."
                : "Iniciando Checkout..."}
            </>
          ) : appliedCoupon?.isLifetimeAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              Ativar Acesso Vitalício Imediato
            </>
          ) : (
            buttonText || `Assinar Plano ${planName || ""}`.trim()
          )}
        </button>
        {appliedCoupon?.isLifetimeAdmin ? (
          <p className="text-xs text-center text-emerald-400/90 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Acesso irrestrito liberado diretamente para sua conta.
          </p>
        ) : (
          <p className="text-xs text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Pagamento 100% Seguro via Stripe.
          </p>
        )}
      </form>
    </div>
  );
}
