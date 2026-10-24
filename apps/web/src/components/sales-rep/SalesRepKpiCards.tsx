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
      accent:
        "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    },
    {
      title: "Trials em Andamento",
      value: summary?.trialTenants ?? 0,
      description: "Contas em período de teste de 7 dias",
      icon: Clock,
      accent:
        "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    },
    {
      title: "Propostas Emitidas",
      value: summary?.totalProposals ?? 0,
      description: "Volume gerado pelos seus clientes",
      icon: FileText,
      accent:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    },
    {
      title: "Comissão Estimada / Mês",
      value: formatCurrency(summary?.estimatedCommission ?? 0),
      description: summary?.commissionTiers
        ? `Regra: ${summary.commissionTiers.firstMonth}% (1ª) · ${summary.commissionTiers.months2To12}% (2ª-12ª) · ${summary.commissionTiers.months13Plus}% (13ª+)`
        : "Regra: 20% (1ª) · 10% (2ª-12ª) · 5% (13ª+)",
      icon: Banknote,
      accent:
        "text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#050811]/70 p-5 backdrop-blur-md shadow-xs dark:shadow-sm transition-all hover:border-zinc-300 dark:hover:border-white/[0.15]"
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-slate-400 uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              {loading ? (
                <div className="h-8 w-24 bg-zinc-200 dark:bg-white/10 rounded-lg animate-pulse" />
              ) : (
                <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-mono">
                  {card.value}
                </div>
              )}
              <p className="text-xs text-zinc-500 dark:text-slate-400">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
