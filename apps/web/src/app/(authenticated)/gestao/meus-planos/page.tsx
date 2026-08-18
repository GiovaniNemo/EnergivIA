"use client";

import React, { useState, useEffect } from "react";
import PaymentWrapper from "@/components/PaymentForm";
import { LoadingState } from "@/components/ui/loading-state";
import { CheckCircle2, Gem, Rocket, Sparkles } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number | string;
  features?: string | string[] | null;
  active?: boolean;
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
        // Not JSON, continue to split by comma
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
    return ["Propostas ilimitadas", "Suporte WhatsApp", "CRM Completo", "Integração de pagamentos"];
  }

  return ["Acesso à plataforma", "Suporte dedicado"];
}

export default function MeusPlanosPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/proxy/plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data.filter((p: Plan) => p.active !== false));
        }
      } catch (error) {
        console.error("Erro ao buscar planos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
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

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-8 max-w-md mx-auto">
          <Sparkles className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
            Nenhum plano disponível
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Entre em contato com o suporte ou crie planos no painel administrativo.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-8 mb-16 items-stretch ${
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
            const isBasic = plan.name.toLowerCase().includes("básic");
            const isPro = plan.name.toLowerCase().includes("profissional");
            const isHighlighted = isPro || (!isBasic && priceNum > 100);
            const feats = parseFeatures(plan.features, isBasic, isPro);

            return (
              <div
                key={plan.id}
                className={`relative bg-[var(--color-card)] rounded-2xl shadow-xl overflow-hidden border ${
                  isHighlighted
                    ? "border-emerald-500/50 shadow-emerald-500/10 shadow-2xl"
                    : "border-[var(--color-border)]"
                } hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1`}
              >
                {isHighlighted && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Recomendado
                  </div>
                )}

                <div className="p-8 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isHighlighted
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {isHighlighted ? <Gem className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--color-foreground)]">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-extrabold text-[var(--color-primary)]">
                      R$ {priceNum.toFixed(2)}
                    </span>
                    <span className="text-[var(--color-muted-foreground)] font-medium">/mês</span>
                  </div>
                </div>

                <div className="p-8 flex-grow flex flex-col justify-between">
                  <ul className="space-y-4 mb-8">
                    {feats.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-[var(--color-foreground)]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-4">
                    <PaymentWrapper planId={plan.id} planName={plan.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
