"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "./providers/organization-provider";
import PaymentWrapper from "./PaymentForm";

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
      // Evita o scroll do body quando o modal estiver aberto
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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
      <div className="bg-[var(--color-background)] w-full max-w-5xl rounded-3xl shadow-2xl p-8 border border-[var(--color-border)] my-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--color-foreground)] mb-2">
            Seu período de testes acabou!
          </h2>
          <p className="text-lg text-[var(--color-muted-foreground)]">
            Para continuar usando a plataforma EnergivIA, por favor escolha um dos nossos planos
            abaixo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col"
            >
              <div className="p-6 bg-[var(--color-muted)]/30 border-b border-[var(--color-border)]">
                <h3 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[var(--color-primary)]">
                    R$ {Number(plan.price ?? 0).toFixed(2)}
                  </span>
                  <span className="text-[var(--color-muted-foreground)] font-medium">/mês</span>
                </div>
              </div>
              <div className="p-6 flex-grow">
                <ul className="space-y-3 mb-6">
                  {(() => {
                    let feats: string[] = [];
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

                    if (feats.length > 0) {
                      return feats.map((feat: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-[var(--color-foreground)]"
                        >
                          <svg
                            className="w-5 h-5 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {feat.trim()}
                        </li>
                      ));
                    }

                    return (
                      <li className="text-sm text-[var(--color-muted-foreground)]">
                        Assine para liberar os recursos!
                      </li>
                    );
                  })()}
                </ul>
                <PaymentWrapper planId={plan.id} planName={plan.name} />
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full text-center p-8 text-[var(--color-muted-foreground)]">
              Carregando planos disponíveis...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
