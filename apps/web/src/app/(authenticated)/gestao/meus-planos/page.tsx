"use client";

import React, { useState, useEffect } from "react";
import PaymentWrapper from "@/components/PaymentForm";
import { LoadingState } from "@/components/ui/loading-state";

// Em um cenário real, esses dados viriam da API (fetch('/api/plans'))
const MOCK_PLANS = [
  {
    id: "plan_1",
    name: "Básico",
    price: 99.9,
    features: ["Até 50 propostas/mês", "Suporte por email", "Acesso ao CRM básico"],
  },
  {
    id: "plan_2",
    name: "Profissional",
    price: 199.9,
    features: [
      "Propostas ilimitadas",
      "Suporte WhatsApp",
      "CRM Completo",
      "Integração de pagamentos",
    ],
  },
];

export default function MeusPlanosPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento para uma transição suave
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <LoadingState
        label="Carregando planos..."
        description="Preparando as melhores opções para você"
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-700">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight mb-2">
          Meus Planos
        </h1>
        <p className="text-lg text-[var(--color-muted-foreground)]">
          Escolha o plano perfeito para impulsionar suas vendas de energia solar.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {MOCK_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="bg-[var(--color-card)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)] hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1"
          >
            <div className="p-8 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
              <h3 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[var(--color-primary)]">
                  R$ {plan.price.toFixed(2)}
                </span>
                <span className="text-[var(--color-muted-foreground)] font-medium">/mês</span>
              </div>
            </div>
            <div className="p-8 flex-grow">
              <ul className="space-y-4 mb-8">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-[var(--color-foreground)]">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <PaymentWrapper planId={plan.id} planName={plan.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
