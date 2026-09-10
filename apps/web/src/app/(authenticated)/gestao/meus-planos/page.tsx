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
  Zap,
  XCircle,
  Loader2,
} from "lucide-react";

import { normalizePlanFeatures } from "@energivia/shared-types";
import { getTrialDaysLeft } from "@/lib/business-days";

interface Plan {
  id: string;
  name: string;
  price: number | string;
  features?: string | string[] | Record<string, unknown> | null;
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

function getOriginalPrice(planName: string, currentPrice: number): number | null {
  const lower = (planName || "").toLowerCase();
  if (lower.includes("essencial") || Math.abs(currentPrice - 99.99) < 1) return 169.99;
  if (lower.includes("plus") || Math.abs(currentPrice - 399.99) < 1) return 699.99;
  if (lower.includes("pro") || Math.abs(currentPrice - 199.99) < 1) return 299.99;
  return null;
}

function parseFeatures(
  features: string | string[] | Record<string, unknown> | null | undefined,
  planName?: string,
  isBasic?: boolean,
  isPro?: boolean,
  isPlus?: boolean
): string[] {
  const effectiveName =
    planName || (isPlus ? "Plus" : isPro ? "Pro" : isBasic ? "Essencial" : "Essencial");
  const config = normalizePlanFeatures(features, effectiveName);
  if (config.bulletPoints && config.bulletPoints.length > 0) {
    return config.bulletPoints;
  }
  return ["Acesso total à plataforma", "Geração comercial com IA", "Suporte dedicado"];
}

function MeusPlanosContent() {
  const { currentOrganization, user, refetch: refetchOrg } = useOrganization();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");

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

  const orgCreatedAt = currentOrganization?.createdAt
    ? new Date(currentOrganization.createdAt)
    : null;
  const trialDaysLeft =
    user?.trialDaysLeft ?? (orgCreatedAt ? getTrialDaysLeft(orgCreatedAt, 5) : 5);

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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider mb-3 border border-[var(--color-primary)]/20">
          <Zap className="w-3.5 h-3.5" />
          Gerenciamento de Assinatura
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--color-foreground)] tracking-tight mb-3">
          Meus Planos & Assinaturas
        </h1>
        <p className="text-base md:text-lg text-[var(--color-muted-foreground)]">
          Controle sua assinatura atual, faça upgrades para liberar mais propostas ou gerencie seus
          pagamentos de forma segura.
        </p>
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
                  R$ {currentPlanPrice.toFixed(2)}
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
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-semibold text-sm transition shadow-sm disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold text-sm transition"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Plano
              </button>
            </div>
          </div>
        </div>
      ) : trialDaysLeft === 0 ? (
        <div className="mb-12 bg-gradient-to-r from-rose-950/40 via-[var(--color-card)] to-rose-950/20 border border-rose-500/40 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                  Seu tempo de testes acabou
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase tracking-wider">
                  Expirado
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                O período gratuito de 5 dias da sua empresa encerrou. Escolha um dos planos abaixo
                para continuar gerando orçamentos, dimensionamentos solares e propostas comerciais.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                  Você está no período de teste gratuito
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                Aproveite para testar todos os recursos. Escolha um plano abaixo para garantir
                acesso contínuo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PLANS GRID */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-6 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[var(--color-primary)]" />
          {subscription ? "Opções de Upgrade & Outros Planos" : "Planos Disponíveis"}
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 max-w-md mx-auto">
            <Sparkles className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
              Nenhum plano disponível
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)]">
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
              const isUpgrade = subscription && priceNum > currentPlanPrice;
              const planNameLower = (plan.name || "").toLowerCase();
              const isPlus = planNameLower.includes("plus");
              const isPro = planNameLower.includes("pro") || planNameLower.includes("profissional");
              const isBasic =
                planNameLower.includes("essencial") || planNameLower.includes("básic");
              const isHighlighted = isCurrentPlan ? true : isPro;
              const originalPrice = getOriginalPrice(plan.name, priceNum);
              const feats = parseFeatures(plan.features, plan.name, isBasic, isPro, isPlus);

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[var(--color-card)] rounded-3xl shadow-xl overflow-hidden border ${
                    isCurrentPlan
                      ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/30"
                      : isHighlighted
                        ? "border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] ring-1 ring-yellow-500/30"
                        : "border-[var(--color-border)]"
                  } hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1`}
                >
                  {/* Status Badges */}
                  {isCurrentPlan ? (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-extrabold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Seu Plano Atual
                    </div>
                  ) : isUpgrade ? (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 text-xs font-extrabold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      Disponível p/ Upgrade
                    </div>
                  ) : isHighlighted ? (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-slate-950 text-xs font-extrabold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Mais Escolhido
                    </div>
                  ) : null}

                  <div className="p-8 border-b border-[var(--color-border)] bg-[var(--color-muted)]/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                          isCurrentPlan
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isHighlighted
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                              : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]"
                        }`}
                      >
                        {isPro || isPlus ? (
                          <Gem className="w-6 h-6" />
                        ) : (
                          <Rocket className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[var(--color-foreground)]">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                          {isPlus
                            ? "Para empresas com grande escala e franquias"
                            : isPro
                              ? "O mais popular • Alta conversão e automação"
                              : "Ideal para começar a gerar propostas"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      {originalPrice && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm line-through text-[var(--color-muted-foreground)] font-medium">
                            R$ {originalPrice.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ECONOMIZE {Math.round((1 - priceNum / originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-[var(--color-foreground)]">
                          R$ {priceNum.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[var(--color-muted-foreground)] font-medium">
                          /mês
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex-grow flex flex-col justify-between">
                    <ul className="space-y-4 mb-8">
                      {feats.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-[var(--color-foreground)]"
                        >
                          <CheckCircle2
                            className={`w-5 h-5 shrink-0 mt-0.5 ${
                              isCurrentPlan
                                ? "text-emerald-400"
                                : isHighlighted
                                  ? "text-yellow-400"
                                  : "text-emerald-500"
                            }`}
                          />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
                      {isCurrentPlan ? (
                        <div className="w-full py-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-center text-sm flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Plano Atual em Uso
                        </div>
                      ) : isUpgrade ? (
                        <PaymentWrapper
                          planId={plan.id}
                          planName={plan.name}
                          planPrice={priceNum}
                          buttonText={
                            plan.name.toLowerCase().startsWith("plano")
                              ? `Fazer Upgrade para ${plan.name}`
                              : `Fazer Upgrade para Plano ${plan.name}`
                          }
                          className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 hover:scale-[1.02]"
                        />
                      ) : (
                        <PaymentWrapper
                          planId={plan.id}
                          planName={plan.name}
                          planPrice={priceNum}
                          buttonText={
                            subscription
                              ? plan.name.toLowerCase().startsWith("plano")
                                ? `Trocar para ${plan.name}`
                                : `Trocar para Plano ${plan.name}`
                              : plan.name.toLowerCase().startsWith("plano")
                                ? `Assinar ${plan.name}`
                                : `Assinar Plano ${plan.name}`
                          }
                          className="w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md hover:scale-[1.02]"
                        />
                      )}
                    </div>
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
          <div className="bg-[var(--color-card)] border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-[var(--color-foreground)]">
                Cancelar Assinatura?
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Você tem certeza que deseja cancelar sua assinatura do plano{" "}
                <strong className="text-[var(--color-foreground)]">{currentPlan?.name}</strong>? Ao
                cancelar, sua conta voltará para as limitações gratuitas ao término do período
                atual.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 py-3 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-semibold text-sm transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
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
