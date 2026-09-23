"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  Gauge,
  Receipt,
  ScanLine,
  Sparkles,
} from "lucide-react";

interface BillScannerVisualizerProps {
  fileName?: string;
  previewUrl?: string | null;
  message?: string;
}

// Histórico simulado de 12 meses de consumo (kWh)
const MOCK_HISTORY_BARS = [
  { month: "OUT", val: 68 },
  { month: "NOV", val: 74 },
  { month: "DEZ", val: 89 },
  { month: "JAN", val: 95 },
  { month: "FEV", val: 92 },
  { month: "MAR", val: 84 },
  { month: "ABR", val: 78 },
  { month: "MAI", val: 70 },
  { month: "JUN", val: 65 },
  { month: "JUL", val: 62 },
  { month: "AGO", val: 75 },
  { month: "SET", val: 88 },
];

export function BillScannerVisualizer({
  fileName,
  previewUrl,
  message = "Processando fatura de energia...",
}: BillScannerVisualizerProps): JSX.Element {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [latency, setLatency] = useState(21);

  // Cronômetro para orquestrar as etapas de decodificação neural
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedMs(now - start);
      // Simula flutuação realista de latência de inferência
      setLatency(19 + Math.floor((Math.sin(now / 500) + 1) * 3));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Fases de detecção sincronizadas
  const isConcessionariaDetected = elapsedMs >= 900;
  const isConsumoDetected = elapsedMs >= 2200;
  const isHistoricoDetected = elapsedMs >= 3700;
  const isTarifasDetected = elapsedMs >= 5200;

  // Cálculo de progresso contínuo suave (0 a 100%)
  const progressPercent = Math.min(
    100,
    Math.round(
      elapsedMs < 1000
        ? (elapsedMs / 1000) * 25
        : elapsedMs < 2500
          ? 25 + ((elapsedMs - 1000) / 1500) * 25
          : elapsedMs < 4000
            ? 50 + ((elapsedMs - 2500) / 1500) * 25
            : elapsedMs < 6000
              ? 75 + ((elapsedMs - 4000) / 2000) * 23
              : 98 + Math.min(2, (elapsedMs - 6000) / 2000)
    )
  );

  // Confiança da IA neural
  const confidenceScore =
    elapsedMs < 1000 ? 84.2 : elapsedMs < 2500 ? 93.6 : elapsedMs < 4000 ? 97.4 : 99.8;

  return (
    <div
      className="relative flex h-full min-h-[420px] sm:min-h-[460px] w-full flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-gray-950 text-white shadow-[0_0_40px_rgba(16,185,129,0.12)]"
      role="status"
      aria-live="polite"
    >
      {/* Grade de fundo estilo HUD de Visão Computacional */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[linear-gradient(to_right,#10b98118_1px,transparent_1px),linear-gradient(to_bottom,#10b98118_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -left-1/4 top-0 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl" />
      </div>

      {/* Top HUD Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 bg-gray-900/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider text-emerald-400">
            ENERGIV.IA // OCR NEURAL v2.4
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[0.7rem] text-gray-400">
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/40 px-2 py-0.5 border border-emerald-500/20">
            <Cpu className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-300">{latency}ms</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/40 px-2 py-0.5 border border-emerald-500/20">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-300">{confidenceScore}% precisão</span>
          </div>
          <span className="hidden sm:inline-block text-gray-500">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Área Central: Documento Simulado com Scanner Laser & Caixas Ópticas */}
      <div className="relative flex-1 p-3 sm:p-5 overflow-hidden">
        {/* Document Sheet Backdrop */}
        <div className="relative mx-auto flex h-full max-w-2xl flex-col rounded-xl border border-emerald-500/25 bg-gray-900/60 p-3 sm:p-4 backdrop-blur-sm overflow-hidden shadow-inner">
          {/* Opcional: Imagem do arquivo real em baixa opacidade como base */}
          {previewUrl && (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10 blur-[1px] filter"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
          )}

          {/* Laser Scanner Sweep Animado */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center"
            initial={{ top: "0%" }}
            animate={{ top: ["2%", "94%", "2%"] }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Feixe luminoso de varredura */}
            <div className="h-14 w-full bg-gradient-to-b from-emerald-400/20 via-emerald-400/5 to-transparent" />
            {/* Linha laser de precisão */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#34d399]" />
            {/* Ponto focal central */}
            <div className="relative -top-[3px] h-1.5 w-8 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
          </motion.div>

          {/* GRID DE DETECÇÃO NEURAL */}
          <div className="relative z-10 flex flex-1 flex-col justify-between gap-3">
            {/* SEÇÃO SUPERIOR: Box 1 (Concessionária & Identificação) */}
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{
                opacity: isConcessionariaDetected ? 1 : 0.45,
                scale: isConcessionariaDetected ? 1 : 0.99,
              }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-lg p-2.5 sm:p-3 transition-colors ${
                isConcessionariaDetected
                  ? "border border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border border-gray-800 bg-gray-900/40"
              }`}
            >
              {/* Retículas ópticas de canto */}
              <CornerReticles active={isConcessionariaDetected} />

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md p-1.5 ${
                      isConcessionariaDetected
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[0.65rem] uppercase tracking-wider text-gray-400">
                        Bloco 01 // Distribuidora & UC
                      </span>
                      {isConcessionariaDetected && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[0.6rem] text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5" /> 99.8%
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs sm:text-sm font-semibold text-white">
                      {isConcessionariaDetected
                        ? "CPFL PAULISTA // UC: 7004928104"
                        : "Identificando concessionária..."}
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-block font-mono text-[0.65rem] text-emerald-400/80">
                  {isConcessionariaDetected ? "GRUPO B // B3 COMERCIAL" : "[LOCALIZANDO...]"}
                </span>
              </div>
            </motion.div>

            {/* SEÇÃO MÉDIA: Box 2 (Faturamento & Consumo) + Box 4 (Tributos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box 2: Consumo Faturado */}
              <motion.div
                initial={{ opacity: 0.35 }}
                animate={{
                  opacity: isConsumoDetected ? 1 : 0.45,
                  scale: isConsumoDetected ? 1 : 0.99,
                }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-lg p-2.5 sm:p-3 transition-colors ${
                  isConsumoDetected
                    ? "border border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "border border-gray-800 bg-gray-900/40"
                }`}
              >
                <CornerReticles active={isConsumoDetected} />

                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md p-1.5 ${
                      isConsumoDetected
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-gray-400">
                      Bloco 02 // Consumo Ativo
                    </span>
                    <p className="font-mono text-sm sm:text-base font-bold text-emerald-300">
                      {isConsumoDetected ? "1.842 kWh" : "Decodificando medição..."}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[0.65rem] text-gray-400">
                  <span>Total Faturado:</span>
                  <span className="font-semibold text-white">
                    {isConsumoDetected ? "R$ 1.684,20" : "---"}
                  </span>
                </div>
              </motion.div>

              {/* Box 4: Encargos & CIP */}
              <motion.div
                initial={{ opacity: 0.35 }}
                animate={{
                  opacity: isTarifasDetected ? 1 : 0.45,
                  scale: isTarifasDetected ? 1 : 0.99,
                }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-lg p-2.5 sm:p-3 transition-colors ${
                  isTarifasDetected
                    ? "border border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "border border-gray-800 bg-gray-900/40"
                }`}
              >
                <CornerReticles active={isTarifasDetected} />

                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md p-1.5 ${
                      isTarifasDetected
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-gray-400">
                      Bloco 04 // Tributos & Tarifas
                    </span>
                    <p className="font-mono text-sm font-semibold text-teal-300">
                      {isTarifasDetected ? "TUSD + TE + CIP" : "Calculando alíquotas..."}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[0.65rem] text-gray-400">
                  <span>ICMS / PIS / COFINS:</span>
                  <span className="font-semibold text-white">
                    {isTarifasDetected ? "Integrado (25%)" : "---"}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* SEÇÃO INFERIOR: Box 3 (Histórico 12 Meses com Mini-Histograma Animado) */}
            <motion.div
              initial={{ opacity: 0.35 }}
              animate={{
                opacity: isHistoricoDetected ? 1 : 0.45,
                scale: isHistoricoDetected ? 1 : 0.99,
              }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-lg p-2.5 sm:p-3 transition-colors ${
                isHistoricoDetected
                  ? "border border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border border-gray-800 bg-gray-900/40"
              }`}
            >
              <CornerReticles active={isHistoricoDetected} />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md p-1.5 ${
                      isHistoricoDetected
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-gray-400">
                    Bloco 03 // Histórico de Consumo (12 Meses)
                  </span>
                </div>
                <span className="font-mono text-[0.65rem] text-emerald-400">
                  {isHistoricoDetected ? "Média: 1.780 kWh/mês" : "Extraindo tabela..."}
                </span>
              </div>

              {/* Histograma Animado de 12 Meses */}
              <div className="flex h-12 items-end justify-between gap-1 pt-1">
                {MOCK_HISTORY_BARS.map((item, index) => (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t bg-gradient-to-t from-emerald-600/70 to-teal-400"
                      initial={{ height: 4 }}
                      animate={{
                        height: isHistoricoDetected ? `${item.val}%` : "12%",
                      }}
                      transition={{
                        duration: 0.5,
                        delay: isHistoricoDetected ? index * 0.04 : 0,
                        ease: "easeOut",
                      }}
                    />
                    <span className="font-mono text-[0.55rem] text-gray-500">{item.month}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer com Status da Inferência & Barra de Progresso Contínua */}
      <div className="relative z-20 border-t border-emerald-500/20 bg-gray-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-md">
                {fileName || "fatura_energia.pdf"}
              </span>
              <p className="font-mono text-[0.7rem] text-emerald-400">
                {isTarifasDetected
                  ? "Extração concluída com sucesso. Gerando proposta solar..."
                  : isHistoricoDetected
                    ? "Calculando sazonalidade e histórico de 12 meses..."
                    : isConsumoDetected
                      ? "Mapeando dados de faturamento e tarifas..."
                      : isConcessionariaDetected
                        ? "Localizando concessionária e unidade consumidora..."
                        : message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-bold text-emerald-400">{progressPercent}%</span>
          </div>
        </div>

        {/* Linha de Progresso Contínua Metálica */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}

// Subcomponente de Retículas Ópticas dos Cantos (Estilo Mira de Visão Computacional)
function CornerReticles({ active }: { active: boolean }): JSX.Element {
  const colorClass = active ? "border-emerald-400 opacity-90" : "border-gray-600 opacity-40";

  return (
    <>
      {/* Canto Superior Esquerdo */}
      <span
        className={`absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 transition-colors ${colorClass}`}
      />
      {/* Canto Superior Direito */}
      <span
        className={`absolute -top-1 -right-1 h-2 w-2 border-t-2 border-r-2 transition-colors ${colorClass}`}
      />
      {/* Canto Inferior Esquerdo */}
      <span
        className={`absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 transition-colors ${colorClass}`}
      />
      {/* Canto Inferior Direito */}
      <span
        className={`absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 transition-colors ${colorClass}`}
      />
    </>
  );
}
