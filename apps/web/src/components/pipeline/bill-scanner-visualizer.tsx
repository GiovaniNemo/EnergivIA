"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Gauge,
  Loader2,
  Receipt,
  ScanLine,
  Sparkles,
} from "lucide-react";

interface BillScannerVisualizerProps {
  fileName?: string;
  previewUrl?: string | null;
  message?: string;
}

export function BillScannerVisualizer({
  fileName,
  previewUrl,
  message = "Lendo dados da fatura...",
}: BillScannerVisualizerProps): JSX.Element {
  const [elapsedMs, setElapsedMs] = useState(0);

  // Incrementa cronômetro para sequenciar as etapas de destaque visual
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Fases de detecção por tempo decorrido
  const isConcessionariaDetected = elapsedMs >= 1000;
  const isConsumoDetected = elapsedMs >= 2400;
  const isHistoricoDetected = elapsedMs >= 4000;
  const isTarifasDetected = elapsedMs >= 5800;

  return (
    <div
      className="relative flex h-full min-h-[380px] sm:min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-gray-950 text-white shadow-[0_0_50px_rgba(16,185,129,0.15)]"
      role="status"
      aria-live="polite"
    >
      {/* Background Holographic Grid / Cyberpunk Matrix Glow */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="h-full w-full bg-[linear-gradient(to_right,#10b98115_1px,transparent_1px),linear-gradient(to_bottom,#10b98115_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -left-1/4 top-0 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      {/* Top HUD Bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-emerald-500/20 bg-gray-900/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <div className="flex items-center gap-1.5">
            <ScanLine className="h-4 w-4 text-emerald-400" />
            <span className="text-[0.7rem] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
              Escaneamento Neural IA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="max-w-[140px] sm:max-w-[200px] truncate font-mono text-[0.7rem] text-gray-400">
            {fileName || "fatura_energia.pdf"}
          </span>
          <span className="font-mono text-[0.7rem] font-semibold text-emerald-400/90">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Document Scanning Viewport with Laser and Dynamic Bounding Boxes */}
      <div className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
        {/* Document Surface */}
        <div className="relative mx-auto flex h-full max-w-md flex-col rounded-xl border border-gray-800 bg-gray-900/60 p-3.5 shadow-2xl backdrop-blur-sm">
          {previewUrl ? (
            /* Imagem real da fatura se disponível */
            <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20">
              <img
                src={previewUrl}
                alt="Documento"
                className="h-full w-full object-cover object-top filter grayscale contrast-150"
              />
            </div>
          ) : (
            /* Mock vetorial realista de fatura de energia brasileira */
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl p-4 opacity-15 select-none">
              <div className="flex items-center justify-between border-b border-gray-600 pb-2">
                <div className="h-4 w-28 rounded bg-gray-400" />
                <div className="h-3 w-16 rounded bg-gray-500" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-3/4 rounded bg-gray-500" />
                <div className="h-2.5 w-1/2 rounded bg-gray-600" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="h-12 rounded bg-gray-700/60" />
                <div className="h-12 rounded bg-gray-700/60" />
                <div className="h-12 rounded bg-gray-700/60" />
              </div>
              {/* Gráfico de histórico de barras */}
              <div className="mt-8 flex h-20 items-end justify-between gap-1 border-b border-gray-600 pb-1">
                {[45, 60, 75, 50, 65, 80, 70, 85, 90, 60, 75, 70].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t bg-gray-600"
                  />
                ))}
              </div>
            </div>
          )}

          {/* LASER SWEEP BEAM (Linha de Varredura Neon) */}
          <div className="pointer-events-none absolute inset-x-0 z-30 animate-laser-sweep">
            {/* Feixe luminoso vertical */}
            <div className="h-20 -translate-y-10 bg-gradient-to-b from-emerald-400/0 via-emerald-400/20 to-emerald-400/0" />
            {/* Linha laser de corte */}
            <div className="relative h-[2.5px] w-full bg-emerald-400 shadow-[0_0_12px_#10b981,0_0_24px_#34d399]">
              <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
              <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
            </div>
          </div>

          {/* HUD BOUNDING BOXES (Destaque em tempo real dos campos) */}
          <div className="relative z-10 flex flex-1 flex-col justify-between space-y-2.5">
            {/* BOX 1: Concessionária & Identificação */}
            <div
              className={`relative rounded-lg border p-2.5 transition-all duration-500 ${
                isConcessionariaDetected
                  ? "border-emerald-400/80 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-hud-box"
                  : "border-gray-800/60 bg-gray-900/30 opacity-40"
              }`}
            >
              {/* Retículas nos 4 cantos */}
              <div className="absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2 border-emerald-400" />
              <div className="absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-emerald-400" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400">
                    Concessionária & Unidade Consumidora
                  </span>
                </div>
                {isConcessionariaDetected ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Mapeada
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-gray-500">Detectando…</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300 font-medium">
                {isConcessionariaDetected
                  ? "Padrão ANEEL identificado · Código de Instalação & Grupo B"
                  : "Localizando cabeçalho da fatura..."}
              </p>
            </div>

            {/* BOX 2: Consumo do Mês (kWh) */}
            <div
              className={`relative rounded-lg border p-2.5 transition-all duration-500 ${
                isConsumoDetected
                  ? "border-cyan-400/80 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-hud-box"
                  : "border-gray-800/60 bg-gray-900/30 opacity-40"
              }`}
            >
              <div className="absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2 border-cyan-400" />
              <div className="absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-cyan-400" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-cyan-400" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-cyan-400">
                    Consumo Ativo Mensal (kWh)
                  </span>
                </div>
                {isConsumoDetected ? (
                  <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-cyan-300">
                    <CheckCircle2 className="h-3 w-3" /> Extraído
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-gray-500">Aguardando varredura…</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300 font-medium">
                {isConsumoDetected
                  ? "Energia ativa lida · Consumo faturado com sucesso"
                  : "Escaneando tabela de medição..."}
              </p>
            </div>

            {/* BOX 3: Histórico de 12 Meses & Sazonalidade */}
            <div
              className={`relative rounded-lg border p-2.5 transition-all duration-500 ${
                isHistoricoDetected
                  ? "border-violet-400/80 bg-violet-950/40 shadow-[0_0_20px_rgba(167,139,250,0.2)] animate-hud-box"
                  : "border-gray-800/60 bg-gray-900/30 opacity-40"
              }`}
            >
              <div className="absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2 border-violet-400" />
              <div className="absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2 border-violet-400" />
              <div className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-violet-400" />
              <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-violet-400" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-400" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-violet-400">
                    Histórico de 12 Meses & Sazonalidade
                  </span>
                </div>
                {isHistoricoDetected ? (
                  <span className="inline-flex items-center gap-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-violet-300">
                    <CheckCircle2 className="h-3 w-3" /> Mapeado
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-gray-500">Aguardando varredura…</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300 font-medium">
                {isHistoricoDetected
                  ? "12 competências capturadas · Média anual e pico calculados"
                  : "Processando gráfico de consumo anual..."}
              </p>
            </div>

            {/* BOX 4: Iluminação Pública (CIP), Tributos e Total */}
            <div
              className={`relative rounded-lg border p-2.5 transition-all duration-500 ${
                isTarifasDetected
                  ? "border-amber-400/80 bg-amber-950/40 shadow-[0_0_20px_rgba(251,191,36,0.2)] animate-hud-box"
                  : "border-gray-800/60 bg-gray-900/30 opacity-40"
              }`}
            >
              <div className="absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2 border-amber-400" />
              <div className="absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2 border-amber-400" />
              <div className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-amber-400" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-400">
                    CIP, Tributos & Iluminação Pública
                  </span>
                </div>
                {isTarifasDetected ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-300">
                    <CheckCircle2 className="h-3 w-3" /> Consolidado
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-gray-500">Aguardando…</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300 font-medium">
                {isTarifasDetected
                  ? "Encargos e impostos separados para a simulação solar"
                  : "Lendo composição financeira e taxas municipais..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status & Progress Footer */}
      <div className="relative z-20 border-t border-emerald-500/20 bg-gray-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              <Loader2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 animate-spin text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {message || "Processando extração neural..."}
              </p>
              <p className="text-[0.65rem] text-gray-400 truncate">
                {isTarifasDetected
                  ? "Finalizando consolidação e dimensionando kit solar..."
                  : isHistoricoDetected
                    ? "Analisando histórico de consumo e sazonalidade..."
                    : isConsumoDetected
                      ? "Mapeando demanda de consumo..."
                      : "Lendo imagem e estrutura óptica..."}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors ${
                isConcessionariaDetected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              Concessionária
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors ${
                isConsumoDetected
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              Consumo
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors ${
                isHistoricoDetected
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              Histórico 12m
            </span>
          </div>
        </div>

        {/* Dynamic Glowing Progress Bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 transition-all duration-300 shadow-[0_0_10px_#10b981]"
            style={{
              width: isTarifasDetected
                ? "95%"
                : isHistoricoDetected
                  ? "75%"
                  : isConsumoDetected
                    ? "50%"
                    : isConcessionariaDetected
                      ? "25%"
                      : "10%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
