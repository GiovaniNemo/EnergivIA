"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PaymentWrapper from "@/components/PaymentForm";
import { LoadingState } from "@/components/ui/loading-state";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  CheckCircle2,
  Gem,
  Rocket,
  Sparkles,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  Calendar,
  XCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number | string;
  features?: string | string[] | null;
  active?: boolean;
}

interface SubscriptionData {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodEnd: string;
  plan?: Plan;
}

function parseFeatures(
  features: string | string[] | null | undefined,
  isBasic?: boolean,
  isPro?: boolean
): string[] {
  if (features) {
    if (Array.isArray(features)) {
      return features;
    }
    if (typeof features === "string") {
      try {
        const parsed = JSON.parse(features);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON
      }
      return features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }

  if (isBasic) {
    return ["Até 50 propostas/mês", "Suporte por email", "Acesso ao CRM básico"];
  }
  if (isPro) {
    return [
      "Propostas ilimitadas",
      "Suporte WhatsApp prioritário",
      "CRM Completo",
      "Integração de pagamentos",
    ];
  }

  return ["Acesso total à plataforma", "Geração ilimitada", "Suporte dedicado"];
}

function MeusPlanosContent() {
  const { currentOrganization, refetch: refetchOrg } = useOrganization();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch active plans
      const plansRes = await fetch("/api/proxy/plans");
      let activePlans: Plan[] = [];
      if (plansRes.ok) {
        const data = await plansRes.json();
        activePlans = Array.isArray(data) ? data.filter((p: Plan) => p.active !== false) : [];
        setPlans(activePlans);
      }

      // 2. Fetch current subscription if organization exists
      if (currentOrganization?.id) {
        const subRes = await fetch(`/api/proxy/stripe/subscription/${currentOrganization.id}`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData && subData.status !== "canceled") {
            setSubscription(subData);
          } else {
            setSubscription(null);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar planos ou assinatura", error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If redirected with session_id, verify immediately
  useEffect(() => {
    if (sessionId) {
      const verify = async () => {
        try {
          const res = await fetch("/api/proxy/stripe/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          if (res.ok) {
            setToastMessage({
              type: "success",
              text: "🎉 Assinatura ativada com sucesso! Todos os recursos foram liberados.",
            });
            await refetchOrg();
            await loadData();
          }
        } catch (err) {
          console.error("Erro ao verificar sessão do Stripe", err);
        }
      };
      verify();
    }
  }, [sessionId, refetchOrg, loadData]);

  const handleOpenPortal = async () => {
    if (!currentOrganization?.id) return;
    setPortalLoading(true);
    try {
      const returnUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await fetch("/api/proxy/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: currentOrganization.id,
          returnUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao abrir portal do Stripe");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir portal Stripe";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentOrganization?.id) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/proxy/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: currentOrganization.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao cancelar assinatura");
      }

      setToastMessage({
        type: "info",
        text: "Assinatura cancelada com sucesso.",
      });
      setShowCancelModal(false);
      setSubscription(null);
      await refetchOrg();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar assinatura";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        label="Carregando planos..."
        description="Preparando as informações da sua conta"
      />
    );
  }

  const currentPlan = subscription?.plan || plans.find((p) => p.id === subscription?.planId);
  const currentPlanPrice = currentPlan
    ? typeof currentPlan.price === "number"
      ? currentPlan.price
      : parseFloat(String(currentPlan.price) || "0")
    : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-500">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`mb-8 p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : toastMessage.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-blue-500/10 border-blue-500/30 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {toastMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400" />}
            {toastMessage.type === "info" && <Sparkles className="w-5 h-5 text-blue-400" />}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--color-foreground)] tracking-tight mb-3">
          Meus Planos & Assinaturas
        </h1>
        <p className="text-base md:text-lg text-[var(--color-muted-foreground)] mb-3 font-medium">
          Controle sua assinatura atual, faça upgrades para liberar mais propostas ou gerencie seus
          pagamentos de forma segura.
        </p>
        <div className="inline-flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-full px-5 py-2">
          <span className="text-emerald-400">✨</span>
          <span className="text-sm text-gray-300">
            Escolha o plano ideal e leve sua gestão solar para o próximo nível.
          </span>
        </div>
      </div>

      {/* CURRENT SUBSCRIPTION BANNER */}
      {subscription && currentPlan ? (
        <div className="mb-12 bg-gradient-to-br from-emerald-950/40 via-[var(--color-card)] to-emerald-950/20 border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Plano Ativo
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)] font-mono">
                  Org: {currentOrganization?.name || "Sua Empresa"}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl font-extrabold text-[var(--color-foreground)]">
                  {currentPlan.name}
                </h2>
                <span className="text-2xl font-bold text-emerald-400">
                  R$ {currentPlanPrice.toFixed(2).replace(".", ",")}
                  <span className="text-sm text-[var(--color-muted-foreground)] font-normal">
                    /mês
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--color-muted-foreground)] pt-1">
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>
                      Renovação em:{" "}
                      <strong className="text-[var(--color-foreground)]">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                      </strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Cobrança automática via Stripe</span>
                </div>
              </div>
            </div>

            {/* Actions for current subscription */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Gerenciar Faturas & Cartão
              </button>

              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold text-sm transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Plano
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12 bg-gray-950/80 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Você ainda não possui um plano ativo</h3>
              <p className="text-sm text-gray-400">
                Escolha uma das opções abaixo para desbloquear propostas, CRM integrado e recursos
                avançados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PLANS GRID */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-8 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-emerald-400" />
          {subscription ? "Opções de Upgrade & Outros Planos" : "Planos Disponíveis"}
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-16 bg-gray-950/80 rounded-2xl border border-gray-800 p-8 max-w-md mx-auto">
            <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum plano disponível</h3>
            <p className="text-sm text-gray-400">
              Os planos cadastrados pelo administrador aparecerão aqui.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-8 items-stretch ${
              plans.length === 1
                ? "max-w-md mx-auto grid-cols-1"
                : plans.length === 2
                  ? "max-w-4xl mx-auto grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {plans.map((plan) => {
              const priceNum =
                typeof plan.price === "number" ? plan.price : parseFloat(String(plan.price) || "0");
              const isCurrentPlan = subscription?.planId === plan.id;
              const isUpgrade = Boolean(subscription && priceNum > currentPlanPrice);
              const isPro = plan.name.toLowerCase().includes("profissional");
              const isBasic = plan.name.toLowerCase().includes("básic");
              const isHighlighted = isPro || (!isBasic && priceNum > 100);
              const feats = parseFeatures(plan.features, isBasic, isPro);

              // Cores e Estilos idênticos ao modal de trava
              const cardBorder = isCurrentPlan
                ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/30"
                : isHighlighted
                  ? "border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.15)]"
                  : "border-gray-800";

              const iconBg = isCurrentPlan
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : isHighlighted
                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

              const priceColor = isHighlighted ? "text-yellow-400" : "text-emerald-400";

              return (
                <div
                  key={plan.id}
                  className={`relative bg-gray-950/80 backdrop-blur-sm rounded-3xl border ${cardBorder} flex flex-col pt-8 p-8 transition-transform hover:-translate-y-1 duration-300`}
                >
                  {/* Floating Badges */}
                  {isCurrentPlan ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> SEU PLANO ATUAL
                    </div>
                  ) : isUpgrade ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> DISPONÍVEL P/ UPGRADE
                    </div>
                  ) : isHighlighted ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-1.5">
                      <span>⭐️</span> MAIS ESCOLHIDO
                    </div>
                  ) : null}

                  {/* Header Row: Left = Icon + Title + Subtitle / Right = Price */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconBg}`}
                      >
                        {isPro || isHighlighted ? (
                          <Gem className="w-6 h-6" />
                        ) : (
                          <Rocket className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white leading-tight">{plan.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {isHighlighted
                            ? "Mais recursos. Mais controle."
                            : "Tudo que você precisa."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-extrabold tracking-tight ${priceColor}`}>
                            R$ {priceNum.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm font-medium">/mês</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent my-6" />

                  {/* Features List */}
                  <div className="flex-grow">
                    <ul className="space-y-4 mb-8">
                      {feats.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-[15px] text-gray-300">
                          <CheckCircle2
                            className={`w-5 h-5 shrink-0 ${
                              isHighlighted ? "text-yellow-500" : "text-emerald-500"
                            }`}
                          />
                          <span className="leading-tight mt-0.5">{feat.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Highlight Quote Box */}
                  {isHighlighted && (
                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 mb-6 flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200/80 leading-relaxed">
                        Tenha uma gestão completa do seu negócio e escale seus resultados com
                        eficiência.
                      </p>
                    </div>
                  )}

                  {/* Action Button & Payment Wrapper */}
                  <div className="mt-auto">
                    {isCurrentPlan ? (
                      <div className="w-full py-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-center text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Plano Atual em Uso
                      </div>
                    ) : (
                      <div
                        className={`[&_button]:w-full [&_button]:py-3.5 [&_button]:rounded-xl [&_button]:text-base [&_button]:font-bold [&_button]:shadow-lg [&_button]:transition-all [&_button:hover]:scale-[1.02] cursor-pointer ${
                          isHighlighted
                            ? "[&_button]:bg-gradient-to-r [&_button]:from-yellow-400 [&_button]:to-amber-500 [&_button]:text-yellow-950 [&_button:hover]:shadow-yellow-500/25"
                            : "[&_button]:bg-emerald-500 [&_button]:text-white [&_button:hover]:bg-emerald-400 [&_button:hover]:shadow-emerald-500/25"
                        }`}
                      >
                        <PaymentWrapper
                          planId={plan.id}
                          planName={plan.name}
                          buttonText={
                            isUpgrade
                              ? `Fazer Upgrade para ${plan.name}`
                              : `Assinar Plano ${plan.name}`
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">Cancelar Assinatura?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Você tem certeza que deseja cancelar sua assinatura do plano{" "}
                <strong className="text-white">{currentPlan?.name}</strong>? Ao cancelar, sua conta
                voltará para as limitações gratuitas ao término do período atual.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white border border-gray-800 font-semibold text-sm transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                {cancelLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeusPlanosPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          label="Carregando planos..."
          description="Preparando as melhores opções para você"
        />
      }
    >
      <MeusPlanosContent />
    </Suspense>
  );
}
