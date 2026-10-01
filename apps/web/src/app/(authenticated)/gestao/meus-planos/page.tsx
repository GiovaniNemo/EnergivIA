"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PaymentWrapper from "@/components/PaymentForm";
import { LoadingState } from "@/components/ui/loading-state";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  Calendar,
  XCircle,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react";

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
      const targetOrgId = currentOrganization?.id || user?.currentOrganizationId || user?.tenantId;
      if (targetOrgId) {
        const subRes = await fetch(`/api/proxy/stripe/subscription/${targetOrgId}`);
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
  }, [currentOrganization?.id, user?.currentOrganizationId, user?.tenantId]);

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

  const effectiveRole = (currentOrganization?.role || user?.role || "").toUpperCase();
  const isOwnerOrAdmin =
    effectiveRole === "OWNER" || effectiveRole === "ADMIN" || effectiveRole === "PLATFORM";

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
        <div className="rounded-full bg-amber-500/10 p-3 text-amber-500 mb-4">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">Acesso Restrito</h2>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
          Apenas os administradores e o proprietário da organização podem gerenciar e contratar
          planos da empresa.
        </p>
        <Link
          href="/painel"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[#43a047]"
        >
          Voltar ao Painel
        </Link>
      </div>
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
            {toastMessage.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
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
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--color-foreground)] tracking-tight mb-3">
          Planos simples para acelerar seu time
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-muted-foreground)]">
          Planos transparentes para integradores e empresas solares que buscam alta conversão e
          automação com IA.
        </p>
      </div>

      {/* CURRENT SUBSCRIPTION BANNER */}
      {subscription && currentPlan ? (
        <div className="mb-10 bg-[var(--color-card)] border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Plano Ativo
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Org: <strong>{currentOrganization?.name || "Sua Empresa"}</strong>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
                {currentPlan.name}
              </h2>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                R$ {currentPlanPrice.toFixed(2).replace(".", ",")}
                <span className="text-xs text-[var(--color-muted-foreground)] font-normal">
                  /mês
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)] pt-0.5">
              {subscription.currentPeriodEnd && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    Renovação em:{" "}
                    <strong className="text-[var(--color-foreground)]">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                    </strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cobrança automática via Stripe</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-semibold text-xs transition disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              Gerenciar Faturas & Cartão
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-semibold text-xs transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar Plano
            </button>
          </div>
        </div>
      ) : trialDaysLeft === 0 ? (
        <div className="mb-10 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-foreground)]">
                  Seu tempo de testes acabou
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase tracking-wider">
                  Expirado
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                O período gratuito de 5 dias encerrou. Escolha um dos planos abaixo para continuar
                gerando orçamentos e propostas comerciais.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-10 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-foreground)]">
                  Você está no período de teste gratuito
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold uppercase tracking-wider">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Aproveite para testar todos os recursos. Escolha um plano abaixo para garantir
                acesso contínuo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GLIDE-STYLE 5-CARD PRICING GRID */}
      {(() => {
        // Resolve database plans
        const essencialPlan =
          plans.find((p) => {
            const n = (p.name || "").toLowerCase();
            return n.includes("essencial") || n.includes("basic") || n.includes("básic");
          }) || plans[0];

        const proPlan =
          plans.find((p) => {
            const n = (p.name || "").toLowerCase();
            return (n.includes("pro") || n.includes("profissional")) && !n.includes("plus");
          }) ||
          plans[1] ||
          plans[0];

        const plusPlan =
          plans.find((p) => {
            const n = (p.name || "").toLowerCase();
            return n.includes("plus") || n.includes("scale") || n.includes("avançad");
          }) ||
          plans[2] ||
          plans[plans.length - 1];

        const getNumericPrice = (p?: Plan, fallback = 0): number => {
          if (!p) return fallback;
          return typeof p.price === "number"
            ? p.price
            : parseFloat(String(p.price) || String(fallback));
        };

        const essencialPrice = getNumericPrice(essencialPlan, 99.99);
        const proPrice = getNumericPrice(proPlan, 199.99);
        const plusPrice = getNumericPrice(plusPlan, 399.99);

        const isEssencialActive = subscription?.planId === essencialPlan?.id;
        const isProActive = subscription?.planId === proPlan?.id;
        const isPlusActive = subscription?.planId === plusPlan?.id;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5 items-stretch w-full mb-12">
            {/* Card 1: Free */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-6 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-foreground)]">Free</h3>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 min-h-[36px] leading-relaxed">
                  Experimente o potencial da geração de orçamentos solares
                </p>

                <div className="mt-5 mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight">
                      R$ 0
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] font-medium">
                      /mês
                    </span>
                  </div>
                </div>

                {/* Glide Limit Pill */}
                <div className="rounded-xl bg-[var(--color-muted)]/80 border border-[var(--color-border)] py-2 px-3 text-xs font-semibold text-[var(--color-muted-foreground)] text-center my-4">
                  5 Dias de Teste
                </div>

                <div className="mb-6">
                  {trialDaysLeft > 0 && !subscription ? (
                    <div className="w-full py-2.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-bold text-xs text-center border border-[var(--color-border)]">
                      Período Ativo ({trialDaysLeft}d)
                    </div>
                  ) : (
                    <div className="w-full py-2.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-bold text-xs text-center border border-[var(--color-border)]">
                      Período de Testes
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4 mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                  Inclui:
                </p>
                <ul className="space-y-2 text-xs text-[var(--color-foreground)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Até 5 propostas solares de teste</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Dimensionamento solar básico</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Leitura OCR de faturas de energia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>1 Usuário integrador</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Essencial */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col justify-between transition-all hover:border-[var(--color-primary)]/40 hover:shadow-lg shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-foreground)]">
                    {essencialPlan?.name || "Essencial"}
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 min-h-[36px] leading-relaxed">
                  Para integradores e consultores solares individuais
                </p>

                <div className="mt-5 mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs line-through text-[var(--color-muted-foreground)] font-medium">
                      R$ 169,99
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      -41%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight">
                      R$ {essencialPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] font-medium">
                      /mês
                    </span>
                  </div>
                </div>

                {/* Glide Limit Pill */}
                <div className="rounded-xl bg-[var(--color-muted)]/80 border border-[var(--color-border)] py-2 px-3 text-xs font-semibold text-[var(--color-foreground)] text-center my-4">
                  50 Propostas / mês
                </div>

                <div className="mb-6">
                  {isEssencialActive ? (
                    <div className="w-full py-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs text-center border border-emerald-500/30 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Plano Atual
                    </div>
                  ) : essencialPlan ? (
                    <PaymentWrapper
                      planId={essencialPlan.id}
                      planName={essencialPlan.name}
                      planPrice={essencialPrice}
                      buttonText={
                        subscription && essencialPrice > currentPlanPrice
                          ? "Fazer Upgrade"
                          : "Começar Agora"
                      }
                      className="w-full py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                    />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4 mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                  Inclui:
                </p>
                <ul className="space-y-2 text-xs text-[var(--color-foreground)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Até 50 propostas com IA / mês</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>2 Usuários na equipe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>1 WhatsApp com IA 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>1 Template personalizado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Cálculo financeiro completo</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Pro (RECOMMENDED - GLIDE FEATURED CARD) */}
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#18231d] via-[#121614] to-[#0c0e0d] text-white p-6 flex flex-col justify-between transition-all shadow-xl shadow-emerald-950/20 hover:border-emerald-500/60 ring-1 ring-emerald-500/30 relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {proPlan?.name || "Pro"}
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-zinc-300/80 mt-1.5 min-h-[36px] leading-relaxed">
                  O mais popular • Alta conversão e automação comercial completa
                </p>

                <div className="mt-5 mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs line-through text-zinc-400 font-medium">
                      R$ 299,99
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      -33%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      R$ {proPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">/mês</span>
                  </div>
                </div>

                {/* Glide Limit Pill (Highlighted) */}
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 px-3 text-xs font-bold text-emerald-300 text-center my-4 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Propostas com IA Ilimitadas</span>
                </div>

                <div className="mb-6">
                  {isProActive ? (
                    <div className="w-full py-2.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs text-center border border-emerald-500/40 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Plano Atual
                    </div>
                  ) : proPlan ? (
                    <PaymentWrapper
                      planId={proPlan.id}
                      planName={proPlan.name}
                      planPrice={proPrice}
                      buttonText={
                        subscription && proPrice > currentPlanPrice
                          ? "Fazer Upgrade para Pro"
                          : "Começar com Pro"
                      }
                      className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                    />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-emerald-500/20 pt-4 mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 mb-3">
                  Tudo do Essencial, mais:
                </p>
                <ul className="space-y-2 text-xs text-zinc-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Propostas com IA sem limites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Radar Solar ANEEL Regional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Alertas ao abrir a proposta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Até 5 usuários na equipe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Até 3 números de WhatsApp IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Templates de proposta ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Simulador bancário (BV, Solfácil)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 4: Plus */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col justify-between transition-all hover:border-[var(--color-primary)]/40 hover:shadow-lg shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-foreground)]">
                    {plusPlan?.name || "Plus"}
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 min-h-[36px] leading-relaxed">
                  Para franquias, distribuidoras e alta escala
                </p>

                <div className="mt-5 mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs line-through text-[var(--color-muted-foreground)] font-medium">
                      R$ 699,99
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      -43%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight">
                      R$ {plusPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] font-medium">
                      /mês
                    </span>
                  </div>
                </div>

                {/* Glide Limit Pill */}
                <div className="rounded-xl bg-[var(--color-muted)]/80 border border-[var(--color-border)] py-2 px-3 text-xs font-semibold text-[var(--color-foreground)] text-center my-4">
                  Equipe & Propostas Ilimitadas
                </div>

                <div className="mb-6">
                  {isPlusActive ? (
                    <div className="w-full py-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs text-center border border-emerald-500/30 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Plano Atual
                    </div>
                  ) : plusPlan ? (
                    <PaymentWrapper
                      planId={plusPlan.id}
                      planName={plusPlan.name}
                      planPrice={plusPrice}
                      buttonText={
                        subscription && plusPrice > currentPlanPrice
                          ? "Fazer Upgrade para Plus"
                          : "Começar com Plus"
                      }
                      className="w-full py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                    />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4 mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                  Tudo do Pro, mais:
                </p>
                <ul className="space-y-2 text-xs text-[var(--color-foreground)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Radar Solar ANEEL Nacional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Whitelabel com domínio próprio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Usuários e vendedores ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Múltiplos WhatsApp com IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>API aberta e Webhooks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Gerente de contas e suporte VIP</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 5: Enterprise */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-6 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-foreground)]">Enterprise</h3>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 min-h-[36px] leading-relaxed">
                  Infraestrutura corporativa, segurança e suporte sob medida
                </p>

                <div className="mt-5 mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight">
                      Custom
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] font-medium">
                      /sob consulta
                    </span>
                  </div>
                </div>

                {/* Glide Limit Pill */}
                <div className="rounded-xl bg-[var(--color-muted)]/80 border border-[var(--color-border)] py-2 px-3 text-xs font-semibold text-[var(--color-muted-foreground)] text-center my-4">
                  Solução Sob Medida
                </div>

                <div className="mb-6">
                  <a
                    href="https://wa.me/5544997423865?text=Ol%C3%A1!%20Gostaria%20de%20conversar%20sobre%20uma%20solu%C3%A7%C3%A3o%20Enterprise%20personalizada%20da%20EnergivIA."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                  >
                    Falar com Consultor
                  </a>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4 mt-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3">
                  Inclui:
                </p>
                <ul className="space-y-2 text-xs text-[var(--color-foreground)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>SLA garantido de 99.9% uptime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Integrações ERP / CRM dedicadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Treinamento e onboarding do time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Migração assistida de base</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Faturamento corporativo por nota fiscal</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

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
