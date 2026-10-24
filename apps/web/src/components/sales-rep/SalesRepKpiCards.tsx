"use client";

import { Building2, Clock, FileText, Banknote } from "lucide-react";
import type { SalesRepSummary } from "@/lib/sales-rep-api";

interface SalesRepKpiCardsProps {
  summary?: SalesRepSummary | null;
  loading?: boolean;
}

export function SalesRepKpiCards({ summary, loading }: SalesRepKpiCardsProps): JSX.Element {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      title: "Empresas na Carteira",
      value: summary?.totalTenants ?? 0,
      description: "Integradores solares atribuídos",
      icon: Building2,
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Trials em Andamento",
      value: summary?.trialTenants ?? 0,
      description: "Contas em período de teste de 7 dias",
      icon: Clock,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Propostas Emitidas",
      value: summary?.totalProposals ?? 0,
      description: "Volume gerado pelos seus clientes",
      icon: FileText,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Comissão Estimada / Mês",
      value: formatCurrency(summary?.estimatedCommission ?? 0),
      description: summary?.commissionTiers
        ? `Regra: ${summary.commissionTiers.firstMonth}% (1ª) · ${summary.commissionTiers.months2To12}% (2ª-12ª) · ${summary.commissionTiers.months13Plus}% (13ª+)`
        : "Regra: 20% (1ª) · 10% (2ª-12ª) · 5% (13ª+)",
      icon: Banknote,
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050811]/70 p-5 backdrop-blur-md shadow-sm transition-all hover:border-white/[0.15]"
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              {loading ? (
                <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-mono">
                  {card.value}
                </div>
              )}
              <p className="text-xs text-slate-400">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
