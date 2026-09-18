"use client";

import React from "react";
import { Check, X, Sparkles, Clock, AlertTriangle, Zap, ShieldCheck } from "lucide-react";

export function ComparisonMatrix(): JSX.Element {
  const comparisonItems = [
    {
      feature: "Tempo para gerar a primeira proposta",
      legacy: "2 a 4 horas (digitação e montagem)",
      energiv: "Menos de 2 minutos via IA",
      icon: Clock,
    },
    {
      feature: "Leitura de dados da Conta de Luz",
      legacy: "Digitação manual propensa a erros",
      energiv: "OCR inteligente automático",
      icon: Zap,
    },
    {
      feature: "Compatibilidade com Distribuidores de Kits",
      legacy: "Consulta manual em múltiplos portais",
      energiv: "Integração e precificação em 1 clique",
      icon: ShieldCheck,
    },
    {
      feature: "Experiência do Cliente Final",
      legacy: "PDFs estáticos e genéricos de 20 páginas",
      energiv: "Proposta interativa 3D + PDF no WhatsApp",
      icon: Sparkles,
    },
    {
      feature: "Risco de erro no dimensionamento elétrico",
      legacy: "Alto (fórmulas manuais e planilhas)",
      energiv: "Zero (algoritmo com validação NBR)",
      icon: AlertTriangle,
    },
  ];

  return (
    <section
      id="comparativo"
      className="relative py-24 sm:py-32 bg-slate-950 text-white overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[800px] rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1 text-xs font-mono text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            BENCHMARK DE PRODUTIVIDADE
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Por que os integradores mais lucrativos escolheram a EnergivIA?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Veja a comparação direta entre o trabalho manual tradicional e o novo padrão tecnológico
            do setor solar.
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/10 p-5 sm:p-6 bg-slate-950/60 font-semibold text-sm">
            <div className="md:col-span-5 text-slate-300">Atividade / Recurso</div>
            <div className="hidden md:block md:col-span-3 text-slate-400">Método Tradicional</div>
            <div className="hidden md:block md:col-span-4 text-emerald-400 font-bold flex items-center gap-2">
              Com a EnergivIA ⚡
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.06]">
            {comparisonItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 p-5 sm:p-6 gap-4 md:gap-0 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="md:col-span-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300 border border-white/5">
                    <item.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-100">{item.feature}</span>
                </div>

                {/* Legacy Mobile Label + Value */}
                <div className="md:col-span-3 flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                  <span className="md:hidden text-xs text-slate-500 font-mono">Tradicional:</span>
                  <div className="flex items-center gap-1.5 text-rose-300/80">
                    <X className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{item.legacy}</span>
                  </div>
                </div>

                {/* EnergivIA Value */}
                <div className="md:col-span-4 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="md:hidden text-xs text-slate-500 font-mono">EnergivIA:</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{item.energiv}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Callout Banner */}
          <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left text-xs text-slate-300">
              <span className="font-bold text-white block sm:inline">
                Aumente sua taxa de conversão em até 35%
              </span>{" "}
              respondendo o cliente na hora em que a dor da conta alta está recente.
            </div>
            <a
              href="/login"
              className="shrink-0 rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Criar Conta Gratuita
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
