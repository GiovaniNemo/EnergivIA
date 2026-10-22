"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sun, Cpu } from "lucide-react";

export type BartExpression =
  | "feliz"
  | "animado"
  | "pensativo"
  | "determinado"
  | "alegre"
  | "piscando";

interface BartMascotVisualProps {
  expression?: BartExpression;
  isProcessing?: boolean;
  showTelemetry?: boolean;
  hsp?: string;
  kwp?: string;
}

export function BartMascotVisual({
  expression = "feliz",
  isProcessing = false,
  showTelemetry = true,
  hsp = "5.12",
  kwp = "7.42",
}: BartMascotVisualProps) {
  // SVG Face Visor renderizado estritamente de acordo com o Model Sheet oficial
  const renderVisorEyes = () => {
    switch (expression) {
      case "pensativo":
        return (
          <g className="transition-all duration-300">
            {/* Olho esquerdo semicerrado */}
            <path
              d="M 32 46 Q 44 42 56 47"
              stroke="#00D1FF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Olho direito pensativo com sobrancelha sutil */}
            <path
              d="M 72 43 Q 84 38 96 44"
              stroke="#00D1FF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Boquinha sutil de dúvida */}
            <path
              d="M 58 64 Q 64 61 70 64"
              stroke="#00D1FF"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      case "determinado":
        return (
          <g className="transition-all duration-300">
            {/* Olhos determinados / focados (linhas diagonais confiantes) */}
            <path
              d="M 30 42 L 56 48"
              stroke="#00D1FF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 98 42 L 72 48"
              stroke="#00D1FF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            {/* Boquinha reta confiante */}
            <line
              x1="56"
              y1="64"
              x2="72"
              y2="64"
              stroke="#00D1FF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        );

      case "animado":
        return (
          <g className="transition-all duration-300">
            {/* Olhos circulares brilhantes / pupila viva */}
            <ellipse cx="44" cy="46" rx="10" ry="12" fill="#00D1FF" />
            <circle cx="41" cy="42" r="3.5" fill="#FFFFFF" />
            <ellipse cx="84" cy="46" rx="10" ry="12" fill="#00D1FF" />
            <circle cx="81" cy="42" r="3.5" fill="#FFFFFF" />
            {/* Boca aberta alegre */}
            <path d="M 52 62 Q 64 74 76 62 Z" fill="#00D1FF" />
          </g>
        );

      case "piscando":
        return (
          <g className="transition-all duration-300">
            {/* Olho esquerdo piscando (linha curva) */}
            <path
              d="M 32 48 Q 44 38 56 48"
              stroke="#00D1FF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Olho direito aberto */}
            <ellipse cx="84" cy="46" rx="9" ry="11" fill="#00D1FF" />
            <circle cx="81" cy="42" r="3" fill="#FFFFFF" />
            {/* Sorriso simpático */}
            <path
              d="M 54 62 Q 64 70 74 62"
              stroke="#00D1FF"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      case "alegre":
        return (
          <g className="transition-all duration-300">
            {/* Dois olhos fechados em arco sorridente ^ ^ */}
            <path
              d="M 32 50 Q 44 36 56 50"
              stroke="#00D1FF"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 72 50 Q 84 36 96 50"
              stroke="#00D1FF"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sorriso amplo */}
            <path
              d="M 50 62 Q 64 74 78 62"
              stroke="#00D1FF"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      case "feliz":
      default:
        return (
          <g className="transition-all duration-300">
            {/* Olhos amigáveis em arco */}
            <path
              d="M 34 49 Q 44 38 54 49"
              stroke="#00D1FF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 74 49 Q 84 38 94 49"
              stroke="#00D1FF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sorriso moderado */}
            <path
              d="M 54 63 Q 64 71 74 63"
              stroke="#00D1FF"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Cards de Telemetria Flutuantes (Posicionados ao redor do robô) */}
      <AnimatePresence>
        {showTelemetry && (
          <>
            {/* Card 1: HSP Irradiação */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="absolute -left-12 top-6 z-20 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Sun className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  HSP Radiação
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">{hsp} kWh/m²</p>
              </div>
            </motion.div>

            {/* Card 2: Potência kWp Dimensionada */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute -right-10 top-16 z-20 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Potência Ótima
                </p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {kwp} kWp
                </p>
              </div>
            </motion.div>

            {/* Card 3: Velocidade de Resposta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute -bottom-4 z-20 flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/95 px-3.5 py-1.5 shadow-md backdrop-blur-md dark:border-cyan-900/50 dark:bg-slate-900/95"
            >
              <Cpu className="h-3.5 w-3.5 text-[#00D1FF]" />
              <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                IA Fotovoltaica:{" "}
                <strong className="text-cyan-700 dark:text-cyan-400">
                  {isProcessing ? "Calculando..." : "Pronto em 1.8s"}
                </strong>
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Renderização do Corpo do BART com Micro-Interações Físicas */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          rotate: isProcessing ? [0, -1, 1, 0] : [0, 0.5, -0.5, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "easeInOut",
        }}
        className="relative flex flex-col items-center"
      >
        {/* Cabeça do BART */}
        <div className="relative z-10 flex h-36 w-44 items-center justify-center rounded-[42px] border-2 border-slate-100 bg-gradient-to-b from-white via-slate-50 to-slate-200 p-2 shadow-[0_12px_28px_rgba(14,38,80,0.12)] dark:border-slate-700 dark:from-slate-100 dark:to-slate-300">
          {/* Headphones laterais (Azul Marinho #0E2650) */}
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 flex h-14 w-6 items-center justify-center rounded-l-2xl border border-slate-300 bg-[#0E2650] shadow-md">
            {/* Anel luminoso com detalhe de cérebro solar */}
            <div className="h-8 w-2 rounded-full bg-[#00D1FF]/80" />
          </div>

          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 flex h-14 w-6 items-center justify-center rounded-r-2xl border border-slate-300 bg-[#0E2650] shadow-md">
            <div className="h-8 w-2 rounded-full bg-[#00D1FF]/80" />
          </div>

          {/* Visor Facial Negro (OLED Acetinado) */}
          <div className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-[28px] border border-slate-800 bg-[#071429] shadow-inner">
            {/* Reflexo de vidro acetinado superior */}
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/10 to-transparent" />

            {/* Expressão Facial em SVG */}
            <svg
              viewBox="0 0 128 90"
              className="relative z-10 h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {renderVisorEyes()}
            </svg>

            {/* Pulso suave de processamento se estiver calculando */}
            {isProcessing && (
              <motion.div
                animate={{ opacity: [0.1, 0.35, 0.1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 bg-[#00D1FF]/15"
              />
            )}
          </div>
        </div>

        {/* Pescoço / Articulação (Azul Marinho) */}
        <div className="h-3 w-10 rounded-sm bg-[#0E2650] shadow-sm" />

        {/* Tronco / Peito Branco com Logo Oficial EnergivIA */}
        <div className="relative flex h-28 w-32 flex-col items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 p-3 shadow-[0_10px_20px_rgba(14,38,80,0.08)] dark:border-slate-700 dark:from-slate-50 dark:to-slate-200">
          {/* Logo no Peito */}
          <div className="mt-1 flex items-center gap-1">
            <span className="font-extrabold text-[13px] tracking-tight text-[#0E2650]">
              Energiv<span className="text-[#00D1FF]">IA</span>
            </span>
          </div>

          <div className="text-[7.5px] font-medium tracking-tight text-slate-500">
            O sol que potencia sua vida
          </div>

          {/* Detalhe mecânico no abdômen */}
          <div className="flex w-full items-center justify-center gap-1.5 pb-1">
            <div className="h-1.5 w-6 rounded-full bg-[#0E2650]/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          </div>
        </div>

        {/* Braços com juntas em azul marinho */}
        <div className="absolute top-[138px] -left-5 h-16 w-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-3 w-full bg-[#0E2650] rounded-t-xl" />
        </div>
        <div className="absolute top-[138px] -right-5 h-16 w-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-3 w-full bg-[#0E2650] rounded-t-xl" />
        </div>
      </motion.div>
    </div>
  );
}
