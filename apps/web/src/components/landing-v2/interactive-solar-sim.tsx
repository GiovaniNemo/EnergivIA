"use client";

import React, { useState } from "react";
import { Sun, Zap, ArrowRight, Coins } from "lucide-react";

export function InteractiveSolarSim(): JSX.Element {
  const [consumo, setConsumo] = useState(850); // kWh
  const tarifaMedia = 0.95; // R$/kWh

  // Formulas
  const contaAtual = consumo * tarifaMedia;
  const kwpNecessario = (consumo / (4.8 * 30 * 0.8)).toFixed(1);
  const qtdPaineis = Math.ceil((Number(kwpNecessario) * 1000) / 580);
  const economiaMensal = Math.round(contaAtual * 0.92);
  const economiaAnual = economiaMensal * 12;
  const economia25Anos = Math.round(economiaAnual * 25 * 1.04); // Considera inflação energética
  const paybackAnos = (2.6 + (consumo < 500 ? 0.6 : 0)).toFixed(1);

  return (
    <section
      id="simulador"
      className="relative py-24 sm:py-32 bg-slate-950 overflow-hidden text-white"
    >
      {/* Background radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-mono text-amber-300">
            <Sun className="h-3.5 w-3.5" />
            SIMULADOR INTERATIVO EM TEMPO REAL
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Calcule o poder de conversão das suas propostas
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Arraste o consumo abaixo e veja a mágica que o algoritmo da EnergivIA apresenta ao seu
            cliente instantaneamente.
          </p>
        </div>

        {/* Interactive Widget Box */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls & Slider (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="consumo-slider" className="text-sm font-semibold text-slate-300">
                    Consumo Médio Mensal
                  </label>
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-base font-bold text-emerald-400">
                    {consumo} kWh
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  id="consumo-slider"
                  type="range"
                  min="200"
                  max="4000"
                  step="50"
                  value={consumo}
                  onChange={(e) => setConsumo(Number(e.target.value))}
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-400 focus:outline-none"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Residencial (200 kWh)</span>
                  <span>Comercial (4.000 kWh)</span>
                </div>
              </div>

              {/* Current expense vs proposed */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs text-slate-400">Gasto atual com a Concessionária</span>
                  <span className="text-sm font-bold text-red-400 line-through">
                    R${" "}
                    {contaAtual.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Nova conta estimada</span>
                    <span className="text-[10px] text-emerald-400">
                      Apenas taxa mínima/iluminação
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    R$ {(contaAtual * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Hardware Spec Pills */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
                  <div className="text-[10px] font-mono text-slate-400">POTÊNCIA DO SISTEMA</div>
                  <div className="text-sm font-bold text-white mt-0.5">{kwpNecessario} kWp</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
                  <div className="text-[10px] font-mono text-slate-400">PAINÉIS ESTIMADOS</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {qtdPaineis} módulos 580W
                  </div>
                </div>
              </div>
            </div>

            {/* Right Dashboard Cards (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Highlight Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 p-6 sm:p-7 shadow-[0_15px_40px_rgba(16,185,129,0.15)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase text-emerald-400">
                      <Coins className="h-4 w-4" />
                      Economia Acumulada em 25 Anos
                    </div>
                    <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 mt-2">
                      R$ {economia25Anos.toLocaleString("pt-BR")}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Dinheiro que permaneceria com a concessionária agora vira patrimônio do seu
                      cliente.
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                    <div className="text-[11px] font-mono text-slate-400">PAYBACK ESTIMADO</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white font-mono mt-0.5">
                      {paybackAnos} <span className="text-xs font-normal text-slate-400">anos</span>
                    </div>
                  </div>
                </div>

                {/* Visual Comparative Graph Bar */}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sem Solar (25 anos perdidos):</span>
                    <span className="text-red-400 font-mono font-bold">
                      R$ {(economia25Anos * 1.15).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-red-600 to-amber-600" />
                  </div>

                  <div className="flex justify-between text-xs pt-2">
                    <span className="text-emerald-300">Com EnergivIA (Economia Limpa):</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      + R$ {economia25Anos.toLocaleString("pt-BR")} no bolso
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                  </div>
                </div>
              </div>

              {/* Bottom conversion CTA inside widget */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-bold text-white">
                      Quer gerar essa proposta agora mesmo com o seu logotipo?
                    </div>
                    <div className="text-slate-400">
                      Crie sua conta e gere suas primeiras propostas em minutos.
                    </div>
                  </div>
                </div>
                <a
                  href="/login"
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  <span>Gerar Minha Proposta</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
