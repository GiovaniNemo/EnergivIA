"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Zap,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  BellRing,
} from "lucide-react";

interface ProposalPreviewProps {
  clientName?: string;
  kwp?: number;
  monthlySavingsBrl?: number;
  totalInvestmentBrl?: number;
  showOpenAlert?: boolean;
}

export function ProposalInteractivePreview({
  clientName = "Dr. Marcos Rocha",
  kwp = 7.42,
  monthlySavingsBrl = 910,
  totalInvestmentBrl = 26800,
  showOpenAlert = true,
}: ProposalPreviewProps) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      {/* Toast Flutuante: Alerta de Visualização em Tempo Real */}
      {showOpenAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute inset-x-3 top-3 z-30 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-3.5 py-2.5 shadow-xl backdrop-blur-md text-white"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
            <BellRing className="h-4 w-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Alerta em Tempo Real no WhatsApp
            </p>
            <p className="text-xs font-medium text-slate-100 truncate">
              <strong>{clientName}</strong> acabou de abrir sua proposta!
            </p>
          </div>
        </motion.div>
      )}

      {/* Header Editorial da Proposta */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#0E2650] px-2 py-0.5 text-[10px] font-semibold text-white">
              PROPOSTA #PV-8942
            </span>
            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              Sistema Fotovoltaico Conectado à Rede
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliente: <strong className="text-slate-800 dark:text-slate-200">{clientName}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Status</span>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Disponível Online
            </p>
          </div>
        </div>
      </div>

      {/* Grid de 3 Métricas Principais */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Sun className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 uppercase font-medium">Potência</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{kwp} kWp</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <TrendingDown className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 uppercase font-medium">Economia</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ~R$ {monthlySavingsBrl.toLocaleString("pt-BR")}/mês
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400">
            <Zap className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 uppercase font-medium">Geração Média</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white">950 kWh</p>
        </div>
      </div>

      {/* Detalhes Técnicos e Equipamentos */}
      <div className="p-4 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Equipamentos Selecionados
        </p>

        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              13x Módulos 575W N-Type TOPCon
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Tier 1</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              1x Inversor String 6kW com WiFi
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Garantia 10a</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Estrutura Cerâmica Completa
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Alumínio</span>
        </div>
      </div>

      {/* Resumo Financeiro & CTA */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between dark:bg-slate-800/60 dark:border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Investimento Total
          </span>
          <p className="text-base font-extrabold text-[#0E2650] dark:text-emerald-400">
            R$ {totalInvestmentBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl bg-[#0E2650] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#14346b] transition-colors"
        >
          <span>Aprovar Proposta</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
