"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "./providers/organization-provider";
import PaymentWrapper from "./PaymentForm";
import { Rocket, Gem, CheckCircle2, LockKeyhole, TrendingUp } from "lucide-react";

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

  useEffect(() => {
    if (user?.isTrialLocked) {
      document.body.style.overflow = "hidden";

      const style = document.createElement("style");
      style.id = "hide-chatbase-style";
      style.innerHTML = `
        #chatbase-bubble-button,
        #chatbase-bubble-window,
        iframe[src*="chatbase.co"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
      `;
      document.head.appendChild(style);

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
    } else {
      document.body.style.overflow = "auto";
      const styleEl = document.getElementById("hide-chatbase-style");
      if (styleEl) styleEl.remove();
    }

    return () => {
      document.body.style.overflow = "auto";
      const styleEl = document.getElementById("hide-chatbase-style");
      if (styleEl) styleEl.remove();
    };
  }, [user?.isTrialLocked]);

  if (loading || !user?.isTrialLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto px-4 py-12">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[128px]" />
      <div className="pointer-events-none fixed right-1/4 top-1/2 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/10 blur-[128px]" />

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

        <div className="grid md:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {plans.map((plan) => {
            const isBasic = plan.name.toLowerCase().includes("básic");
            const isPro = plan.name.toLowerCase().includes("profissional");
            const isHighlighted = isPro || (!isBasic && plan.price > 100);

            // Cores e Icones baseados no plano
            const cardBorder = isHighlighted
              ? "border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.15)]"
              : "border-gray-800";
            const iconBg = isHighlighted
              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            const priceColor = isHighlighted ? "text-yellow-400" : "text-emerald-400";

            return (
              <div
                key={plan.id}
                className={`relative bg-gray-950/80 backdrop-blur-sm rounded-3xl border ${cardBorder} flex flex-col pt-8 p-8 transition-transform hover:-translate-y-1 duration-300`}
              >
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-1.5">
                    <span>⭐️</span> MAIS ESCOLHIDO
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconBg}`}
                    >
                      {isHighlighted ? <Gem className="w-6 h-6" /> : <Rocket className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white leading-tight">{plan.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {isHighlighted ? "Mais recursos. Mais controle." : "Tudo que você precisa."}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-extrabold tracking-tight ${priceColor}`}>
                          R${" "}
                          {Number(plan.price ?? 0)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                      <span className="text-gray-500 text-sm font-medium">/mês</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent my-6" />

                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {(() => {
                      let feats: string[] = [];
                      if (plan.features) {
                        if (Array.isArray(plan.features)) {
                          feats = plan.features;
                        } else if (typeof plan.features === "string") {
                          try {
                            const parsed = JSON.parse(plan.features);
                            if (Array.isArray(parsed)) feats = parsed;
                            else feats = plan.features.split(",");
                          } catch {
                            feats = plan.features.split(",");
                          }
                        }
                      }

                      if (feats.length === 0) {
                        if (isBasic) {
                          feats = [
                            "Até 50 propostas/mês",
                            "Suporte por email",
                            "Acesso ao CRM básico",
                          ];
                        } else if (isPro) {
                          feats = [
                            "Propostas ilimitadas",
                            "Suporte WhatsApp prioritário",
                            "CRM Completo",
                            "Integração de pagamentos",
                          ];
                        }
                      }

                      if (feats.length > 0) {
                        return feats.map((feat: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-[15px] text-gray-300"
                          >
                            <CheckCircle2
                              className={`w-5 h-5 shrink-0 ${isHighlighted ? "text-yellow-500" : "text-emerald-500"}`}
                            />
                            <span className="leading-tight mt-0.5">{feat.trim()}</span>
                          </li>
                        ));
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
                    <PaymentWrapper planId={plan.id} planName={plan.name} />
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
