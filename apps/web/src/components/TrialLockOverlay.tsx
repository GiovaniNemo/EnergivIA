"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "./providers/organization-provider";
import PaymentWrapper from "./PaymentForm";
import { Rocket, Gem, CheckCircle2, LockKeyhole, LogOut } from "lucide-react";
import { normalizePlanFeatures } from "@energivia/shared-types";

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string | string[] | Record<string, unknown>;
  active?: boolean;
}

export function TrialLockOverlay() {
  const { user, loading } = useOrganization();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user?.isTrialLocked || modalOpen) {
      const fetchPlans = async () => {
        try {
          const response = await fetch("/api/proxy/plans");
          if (response.ok) {
            const data = await response.json();
            setPlans(data.filter((p: Plan) => p.active));
          }
        } catch (error) {
          console.error("Erro ao carregar planos", error);
        }
      };
      fetchPlans();
    }
  }, [user?.isTrialLocked, modalOpen]);

  if (loading) {
    return null;
  }

  // Banner superior para limites atingidos
  let bannerElement: React.ReactNode = null;

  if (
    user?.isTrial &&
    (user?.trialExpired || user?.isTrialProposalLimitReached) &&
    !user?.isTrialLocked
  ) {
    bannerElement = (
      <div className="w-full shrink-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 font-medium flex flex-wrap items-center justify-between gap-3 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>
            {user?.isTrialProposalLimitReached
              ? "⚡ Você atingiu o limite de 20 propostas gratuitas do período de teste."
              : "☀️ Seu período de teste gratuito de 5 dias úteis foi concluído."}{" "}
            Seu histórico continua salvo! Faça upgrade para continuar gerando propostas comerciais
            com IA.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            Ver Planos
          </button>
          <a
            href="/gestao/meus-planos"
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg text-xs transition border border-neutral-700"
          >
            Assinar
          </a>
        </div>
      </div>
    );
  } else if (!user?.isTrial && user?.isProposalLimitReached && !user?.isTrialLocked) {
    bannerElement = (
      <div className="w-full shrink-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 font-medium flex flex-wrap items-center justify-between gap-3 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>
            ⚡ Você atingiu o limite mensal de {user?.proposalsLimit ?? 50} propostas do{" "}
            {user?.planName || "seu plano"}. Faça upgrade para o Plano Pro para gerar propostas
            comerciais ilimitadas.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            Fazer Upgrade
          </button>
          <a
            href="/gestao/meus-planos"
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg text-xs transition border border-neutral-700"
          >
            Ver Planos
          </a>
        </div>
      </div>
    );
  }

  const showModal = Boolean(user?.isTrialLocked || modalOpen);

  if (!bannerElement && !showModal) {
    return null;
  }

  return (
    <>
      {bannerElement}
      {showModal && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto px-4 py-12">
          {/* Background glow effects */}
          <div className="pointer-events-none fixed left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[128px]" />
          <div className="pointer-events-none fixed right-1/4 top-1/2 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/10 blur-[128px]" />

          {/* Botão de fechar modal se aberto voluntariamente */}
          {!user?.isTrialLocked && (
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 left-6 lg:top-8 lg:left-8 z-50 flex items-center gap-2 text-gray-400 hover:text-white bg-gray-900/80 hover:bg-gray-800 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            >
              ✕ Fechar
            </button>
          )}

          <a
            href="/auth/logout"
            className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 flex items-center gap-2 text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-800 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </a>

          <div className="relative w-full max-w-6xl rounded-3xl p-5 lg:p-8 mt-6 md:mt-0">
            <div className="text-center mb-6">
              <div className="w-11 h-11 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <LockKeyhole className="w-5 h-5" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                Seu período de testes <span className="text-emerald-400">acabou!</span>
              </h2>
              <p className="text-sm md:text-base text-gray-400 font-medium">
                Escolha o plano ideal para continuar gerando orçamentos e propostas comerciais com
                IA.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch max-w-6xl mx-auto">
              {plans.map((plan) => {
                const planName = String(plan?.name || "");
                const planPrice = Number(plan?.price ?? 0);
                const planNameLower = planName.toLowerCase();
                const isBasic =
                  planNameLower.includes("essencial") || planNameLower.includes("básic");
                const isPlus = planNameLower.includes("plus");
                const isPro = planNameLower.includes("pro") && !isPlus;
                const isHighlighted = isPro;

                let originalPrice: number | null = null;
                if (isBasic || Math.abs(planPrice - 99.99) < 1) originalPrice = 169.99;
                else if (isPlus || Math.abs(planPrice - 399.99) < 1) originalPrice = 699.99;
                else if (isPro || Math.abs(planPrice - 199.99) < 1) originalPrice = 299.99;

                // Cores e Icones baseados no plano
                const cardBorder = isHighlighted
                  ? "border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/40"
                  : isPlus
                    ? "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/30"
                    : "border-gray-800";
                const iconBg = isPlus
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                  : isHighlighted
                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                const priceColor = isPlus
                  ? "text-purple-400"
                  : isHighlighted
                    ? "text-yellow-400"
                    : "text-emerald-400";

                return (
                  <div
                    key={plan?.id || Math.random()}
                    className={`relative bg-gray-950/95 backdrop-blur-md rounded-2xl border ${cardBorder} flex flex-col p-5 sm:p-6 transition-all duration-200`}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(250,204,21,0.5)] flex items-center gap-1">
                        <span>⭐️</span> MAIS ESCOLHIDO
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${iconBg}`}
                      >
                        {isPro || isPlus ? (
                          <Gem className="w-4 h-4" />
                        ) : (
                          <Rocket className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">
                          {planName || "Plano EnergivIA"}
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          {isPlus
                            ? "Grande escala e franquias"
                            : isPro
                              ? "Alta conversão e IA"
                              : "Comece a crescer"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 bg-gray-900/40 rounded-xl p-3 border border-gray-800/60">
                      {originalPrice && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] line-through text-gray-400 font-medium">
                            R$ {originalPrice.toFixed(2).replace(".", ",")}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                              isPlus
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            -{Math.round((1 - planPrice / originalPrice) * 100)}% OFF
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${priceColor}`}
                        >
                          R$ {planPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-gray-400 text-xs font-medium">/mês</span>
                      </div>
                    </div>

                    <div className="flex-grow mb-4">
                      <ul className="space-y-2.5">
                        {(() => {
                          const config = normalizePlanFeatures(plan?.features, plan?.name);
                          const allFeats = config.bulletPoints || [];
                          const feats = allFeats.slice(0, 5);

                          if (feats.length > 0) {
                            return feats.map((feat: unknown, idx: number) => {
                              const featStr = String(feat || "").trim();
                              if (!featStr) return null;
                              return (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-xs text-gray-300 leading-tight"
                                >
                                  <CheckCircle2
                                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                                      isPlus
                                        ? "text-purple-400"
                                        : isHighlighted
                                          ? "text-yellow-500"
                                          : "text-emerald-500"
                                    }`}
                                  />
                                  <span>{featStr}</span>
                                </li>
                              );
                            });
                          }

                          return (
                            <li className="text-xs text-gray-400">
                              Assine para liberar os recursos!
                            </li>
                          );
                        })()}
                      </ul>
                    </div>

                    <div className="mt-auto pt-2 border-t border-gray-800/80">
                      <PaymentWrapper
                        planId={plan?.id || ""}
                        planName={planName}
                        className={
                          isPlus
                            ? "w-full py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.01] bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25"
                            : isHighlighted
                              ? "w-full py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.01] bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 hover:shadow-yellow-500/25"
                              : "w-full py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.01] bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/25"
                        }
                      />
                    </div>
                  </div>
                );
              })}

              {plans.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                  <p>Carregando planos disponíveis...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
