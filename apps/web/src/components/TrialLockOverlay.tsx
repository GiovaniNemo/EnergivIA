"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "./providers/organization-provider";
import PaymentWrapper from "./PaymentForm";
import { Rocket, Gem, CheckCircle2, LockKeyhole, TrendingUp, LogOut } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string | string[];
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

  // Banner amigável quando o limite do trial é atingido
  if (
    user?.isTrial &&
    (user?.trialExpired || user?.isTrialProposalLimitReached) &&
    !user?.isTrialLocked
  ) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-[55] backdrop-blur-md">
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
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm"
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
  }

  // Banner amigável quando o limite mensal de um plano pago for atingido (ex: Plano Essencial = 50 propostas/mês)
  if (!user?.isTrial && user?.isProposalLimitReached && !user?.isTrialLocked) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-[55] backdrop-blur-md">
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
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm"
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

  if (!user?.isTrialLocked && !modalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto px-4 py-12">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[128px]" />
      <div className="pointer-events-none fixed right-1/4 top-1/2 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/10 blur-[128px]" />

      <a
        href="/auth/logout"
        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 flex items-center gap-2 text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-800 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 text-sm font-medium transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </a>

      <div className="relative w-full max-w-5xl rounded-3xl p-6 lg:p-12 mt-12 md:mt-0">
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Seu período de testes <span className="text-emerald-400">acabou!</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 mb-2 font-medium">
            Continue impulsionando seus resultados com a plataforma EnergivIA.
          </p>
          <div className="inline-flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-full px-5 py-2 mt-2">
            <span className="text-emerald-400">✨</span>
            <span className="text-sm text-gray-300">
              Escolha o plano ideal e leve sua gestão solar para o próximo nível.
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-7xl mx-auto">
          {plans.map((plan) => {
            const planName = String(plan?.name || "");
            const planPrice = Number(plan?.price ?? 0);
            const planNameLower = planName.toLowerCase();
            const isBasic = planNameLower.includes("essencial") || planNameLower.includes("básic");
            const isPlus = planNameLower.includes("plus");
            const isPro = planNameLower.includes("pro") && !isPlus;
            const isHighlighted = isPro;

            let originalPrice: number | null = null;
            if (isBasic || Math.abs(planPrice - 99.99) < 1) originalPrice = 169.99;
            else if (isPlus || Math.abs(planPrice - 399.99) < 1) originalPrice = 699.99;
            else if (isPro || Math.abs(planPrice - 199.99) < 1) originalPrice = 299.99;

            // Cores e Icones baseados no plano
            const cardBorder = isHighlighted
              ? "border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.2)] ring-1 ring-yellow-500/40"
              : "border-gray-800";
            const iconBg = isHighlighted
              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            const priceColor = isHighlighted ? "text-yellow-400" : "text-emerald-400";

            return (
              <div
                key={plan?.id || Math.random()}
                className={`relative bg-gray-950/90 backdrop-blur-sm rounded-3xl border ${cardBorder} flex flex-col pt-8 p-7 transition-transform hover:-translate-y-1 duration-300`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-4 py-1 rounded-full text-[11px] font-extrabold tracking-widest uppercase shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-1.5">
                    <span>⭐️</span> MAIS ESCOLHIDO
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border ${iconBg}`}
                    >
                      {isPro || isPlus ? (
                        <Gem className="w-5 h-5" />
                      ) : (
                        <Rocket className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight">
                        {planName || "Plano EnergivIA"}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isPlus
                          ? "Grande escala e franquias"
                          : isPro
                            ? "Alta conversão e IA"
                            : "Comece a crescer"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  {originalPrice && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs line-through text-gray-400 font-medium">
                        R$ {originalPrice.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        -{Math.round((1 - planPrice / originalPrice) * 100)}% OFF
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-extrabold tracking-tight ${priceColor}`}>
                      R$ {planPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-gray-400 text-xs font-medium">/mês</span>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6" />

                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {(() => {
                      let feats: string[] = [];
                      if (plan?.features) {
                        if (Array.isArray(plan.features)) {
                          feats = plan.features.map((f) => String(f ?? ""));
                        } else if (typeof plan.features === "string") {
                          try {
                            const parsed = JSON.parse(plan.features);
                            if (Array.isArray(parsed)) feats = parsed.map((f) => String(f ?? ""));
                            else feats = plan.features.split(",");
                          } catch {
                            feats = plan.features.split(",");
                          }
                        }
                      }

                      if (feats.length === 0) {
                        if (isBasic) {
                          feats = [
                            "Até 30 propostas por mês",
                            "1 Usuário / Vendedor",
                            "Dimensionamento Solar Inteligente (HSP)",
                            "CRM de Negociações básico",
                            "Geração de PDF Comercial",
                            "Suporte via e-mail e chat",
                          ];
                        } else if (isPlus) {
                          feats = [
                            "Propostas e Cálculos Ilimitados",
                            "Usuários Ilimitados na Equipe",
                            "Múltiplos Bots de WhatsApp com IA",
                            "Radar Solar ANEEL Nacional Ilimitado",
                            "Whitelabel Completo (Sua Marca)",
                            "Gerente de Contas Dedicado",
                          ];
                        } else if (isPro) {
                          feats = [
                            "Propostas Comerciais Ilimitadas",
                            "Até 5 Usuários / Vendedores",
                            "Bot de WhatsApp com IA 24/7",
                            "Radar Solar ANEEL Integrado",
                            "CRM Solar Completo com Automações",
                            "Suporte Prioritário no WhatsApp",
                          ];
                        }
                      }

                      if (feats.length > 0) {
                        return feats.map((feat: unknown, idx: number) => {
                          const featStr = String(feat || "").trim();
                          if (!featStr) return null;
                          return (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-[15px] text-gray-300"
                            >
                              <CheckCircle2
                                className={`w-5 h-5 shrink-0 ${isHighlighted ? "text-yellow-500" : "text-emerald-500"}`}
                              />
                              <span className="leading-tight mt-0.5">{featStr}</span>
                            </li>
                          );
                        });
                      }

                      return <li className="text-gray-400">Assine para liberar os recursos!</li>;
                    })()}
                  </ul>
                </div>

                {isHighlighted && (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200/80 leading-relaxed">
                      Tenha uma gestão completa do seu negócio e escale seus resultados com
                      eficiência.
                    </p>
                  </div>
                )}

                <div className="mt-auto">
                  {/* Container to wrapper the PaymentForm button to inherit styles visually */}
                  <div
                    className={`[&_button]:w-full [&_button]:py-3.5 [&_button]:rounded-xl [&_button]:text-base [&_button]:font-bold [&_button]:shadow-lg [&_button]:transition-all [&_button:hover]:scale-[1.02] ${
                      isHighlighted
                        ? "[&_button]:bg-gradient-to-r [&_button]:from-yellow-400 [&_button]:to-amber-500 [&_button]:text-yellow-950 [&_button:hover]:shadow-yellow-500/25"
                        : "[&_button]:bg-emerald-500 [&_button]:text-white [&_button:hover]:bg-emerald-400 [&_button:hover]:shadow-emerald-500/25"
                    }`}
                  >
                    <PaymentWrapper planId={plan?.id || ""} planName={planName} />
                  </div>
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
  );
}
