"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { FileText, Sun, Zap, CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

type StepId = "fatura" | "motor" | "proposta";

interface StepConfig {
  id: StepId;
  label: string;
  badge: string;
  subLabel: string;
  icon: typeof FileText;
}

const STEPS: StepConfig[] = [
  {
    id: "fatura",
    label: "1. Leitura da Conta de Luz",
    badge: "IA Concluída (1.8s)",
    subLabel: "Extração de histórico e tarifa",
    icon: FileText,
  },
  {
    id: "motor",
    label: "2. Dimensionamento & Kit",
    badge: "Motor Fotovoltaico",
    subLabel: "Cálculo de potência e geração",
    icon: Sun,
  },
  {
    id: "proposta",
    label: "3. Proposta no WhatsApp",
    badge: "Pronta para Fechar",
    subLabel: "Envio em PDF e Link Web",
    icon: FaWhatsapp as unknown as typeof FileText,
  },
];

export function ConvergingHeroShowcase() {
  const [activeStep, setActiveStep] = useState<StepId>("fatura");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-driven 3D perspective animation
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  const rotateX = useTransform(smoothProgress, [0, 1], [6, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.95, 1]);
  const opacity = useTransform(smoothProgress, [0, 0.35, 1], [0.8, 0.98, 1]);
  const y = useTransform(smoothProgress, [0, 1], [30, 0]);

  // Auto-cycle through steps if user hasn't clicked
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((current) => {
        if (current === "fatura") return "motor";
        if (current === "motor") return "proposta";
        return "fatura";
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleStepClick = (stepId: StepId) => {
    setIsAutoPlaying(false);
    setActiveStep(stepId);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-8 w-full max-w-[1160px] px-2 sm:px-4"
      style={{ perspective: 1200 }}
    >
      {/* Warm natural sunbeam radiance behind the platform */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-36 w-3/4 max-w-2xl rounded-full bg-gradient-to-b from-amber-400/15 via-emerald-400/8 to-transparent blur-3xl" />

      {/* Main Platform Browser Frame */}
      <motion.div
        style={{
          rotateX,
          scale,
          opacity,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-t border-r border-amber-300/35 border-b border-l border-slate-700/60 bg-[#0d1626]/95 p-1 sm:p-2 shadow-[0_25px_60px_rgba(0,0,0,0.7),-10px_-10px_40px_rgba(251,191,36,0.06)] backdrop-blur-xl"
      >
        {/* Top Browser Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#09101d] px-4 py-2.5 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
              <div className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
              <div className="h-3 w-3 rounded-full bg-[#10b981]/80" />
            </div>
            <div className="ml-2 hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-0.5 text-[11px] text-slate-300 font-mono">
              <span className="text-emerald-400">https://</span>
              <span>app.energivia.com.br/painel</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IA Ativa em Produção
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              <Sun className="h-3 w-3 text-amber-400" />
              Distribuidor Conectado
            </span>
          </div>
        </div>

        {/* Workflow Steps Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800/90 bg-[#0c1422]">
          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`group relative flex flex-col items-start px-3 py-3 sm:px-5 sm:py-3.5 text-left transition-colors ${
                  isActive ? "bg-slate-800/50" : "hover:bg-slate-800/25"
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 to-amber-400"
                  />
                )}

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-xs transition-colors ${
                      isActive
                        ? "bg-amber-400/20 text-amber-300 font-bold"
                        : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                <div className="mt-1 hidden md:flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">{step.subLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Content Area */}
        <div className="p-4 sm:p-6 md:p-8 min-h-[380px] sm:min-h-[420px] flex items-center">
          <AnimatePresence mode="wait">
            {/* ------------------------------------------------------------- */}
            {/* ETAPA 1: LEITURA DA FATURA                                    */}
            {/* ------------------------------------------------------------- */}
            {activeStep === "fatura" && (
              <motion.div
                key="step-fatura"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28 }}
                className="grid gap-6 md:grid-cols-12 w-full items-center"
              >
                {/* Visual Invoice Extraction Card */}
                <div className="md:col-span-6 rounded-2xl border border-slate-700/70 bg-[#0f192b] p-4 sm:p-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">fatura_energia_copel.pdf</p>
                        <p className="text-[10.5px] text-slate-400">
                          Titular: Marcelo S. Santana • UC: 9812401
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Extraído em 1.8s
                    </span>
                  </div>

                  {/* Extracted Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Consumo Médio Extraído</p>
                      <p className="text-base sm:text-lg font-bold text-amber-300">485 kWh/mês</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Histórico de 12 meses</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Valor Médio da Fatura</p>
                      <p className="text-base sm:text-lg font-bold text-white">R$ 460,75</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tarifa R$ 0,95 / kWh</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Concessionária & Tipo</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-200">
                        Copel Dist. (Paraná)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bifásico Convencional</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Grupo Tarifário</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-200">
                        B1 Residencial
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Telhado Cerâmico</p>
                    </div>
                  </div>

                  {/* Mini consumption timeline */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 mb-1.5">
                      <span>Histórico Anual de Consumo (kWh)</span>
                      <span className="text-emerald-400 font-medium">Sazonalidade Detectada</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-10 pt-1">
                      {[380, 420, 490, 510, 480, 440, 430, 460, 500, 530, 580, 485].map(
                        (val, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-amber-400/30 hover:bg-amber-400/60 rounded-t transition-colors"
                            style={{ height: `${(val / 600) * 100}%` }}
                            title={`Mês ${i + 1}: ${val} kWh`}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanatory Content */}
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Leitura Automática com IA
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    O cliente envia a foto ou PDF, a IA extrai tudo sem erro
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Zero digitação manual. A EnergivIA identifica a concessionária, calcula a média
                    dos últimos 12 meses, detecta sazonalidades e prepara a base técnica para o
                    motor solar em menos de 2 segundos.
                  </p>
                  <div className="pt-2 flex flex-col gap-2 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Compatível com Copel, Enel, Cemig, CPFL e todas as distribuidoras</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Validação automática de titular, endereço e unidade consumidora</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => handleStepClick("motor")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors"
                    >
                      <span>Ver próximo passo: Dimensionamento</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* ETAPA 2: MOTOR SOLAR & KIT                                    */}
            {/* ------------------------------------------------------------- */}
            {activeStep === "motor" && (
              <motion.div
                key="step-motor"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28 }}
                className="grid gap-6 md:grid-cols-12 w-full items-center"
              >
                {/* Solar Sizing Card */}
                <div className="md:col-span-6 rounded-2xl border border-slate-700/70 bg-[#0f192b] p-4 sm:p-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Dimensionamento Fotovoltaico</p>
                        <p className="text-[10.5px] text-slate-400">
                          Radiação Local: 4.92 kWh/m²/dia (Paraná)
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-amber-300">
                      102% Cobertura
                    </span>
                  </div>

                  {/* System Power & Specs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Potência Recomendada</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-400">4,40 kWp</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">8 Módulos de 550W</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Geração Média Estimada</p>
                      <p className="text-base sm:text-lg font-bold text-amber-300">525 kWh/mês</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Suficiente para zerar conta
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Margins Box */}
                  <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Custo do Kit Distribuidor:</span>
                      <span className="font-semibold text-white">R$ 7.200,00</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Margem do Integrador configurada:</span>
                      <span className="font-semibold text-emerald-400">R$ 6.700,00 (48%)</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs sm:text-sm font-bold">
                      <span className="text-slate-300">Preço de Venda Sugerido:</span>
                      <span className="text-base font-extrabold text-amber-300">R$ 13.900,00</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Garantia de 25 anos nos módulos
                    </span>
                    <span>Inversor String 4kW</span>
                  </div>
                </div>

                {/* Explanatory Content */}
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" />
                    Motor Solar Inteligente
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Cálculo exato de geração e kit fotovoltaico ideal
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    O motor solar da EnergivIA cruza a irradiação solar da cidade, orientações de
                    telhado e perdas térmicas para sugerir o kit ideal de inversores e módulos com
                    estoque real de distribuidores.
                  </p>
                  <div className="pt-2 flex flex-col gap-2 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Integração de kits com distribuidores parceiros</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Regras de margem e precificação configuradas uma única vez</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => handleStepClick("proposta")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
                    >
                      <span>Ver próximo passo: Envio no WhatsApp</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* ETAPA 3: PROPOSTA NO WHATSAPP                                 */}
            {/* ------------------------------------------------------------- */}
            {activeStep === "proposta" && (
              <motion.div
                key="step-proposta"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28 }}
                className="grid gap-6 md:grid-cols-12 w-full items-center"
              >
                {/* Proposal Preview Card */}
                <div className="md:col-span-6 rounded-2xl border border-slate-700/70 bg-[#0f192b] p-4 sm:p-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                        <FaWhatsapp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Proposta Comercial — Marcelo Santana
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          Sistema 4,40 kWp • Pronto para Envio
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                      Link + PDF
                    </span>
                  </div>

                  {/* Proposal Financial Highlights */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Economia Anual Estimada</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-400">R$ 5.120,00</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Até 95% de redução</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-3">
                      <p className="text-[10.5px] text-slate-400">Retorno do Investimento</p>
                      <p className="text-base sm:text-lg font-bold text-amber-300">3,1 Anos</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Payback acelerado</p>
                    </div>
                  </div>

                  {/* Financing Simulation Box */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Opção Financiamento Bancário:</span>
                      <span className="font-bold text-white">60x de R$ 312,00</span>
                    </div>
                    <p className="text-[10.5px] text-emerald-400 font-medium">
                      ✓ A própria economia mensal da conta de luz paga a parcela
                    </p>
                  </div>

                  {/* WhatsApp Action Button */}
                  <div className="pt-1">
                    <a
                      href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 shadow-md"
                    >
                      <FaWhatsapp className="h-4 w-4" />
                      <span>Enviar Proposta Comercial no WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Explanatory Content */}
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
                    <FaWhatsapp className="h-3.5 w-3.5 text-emerald-400" />
                    Fechamento Comercial
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Proposta pronta no canal onde o cliente decide
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    O integrador não precisa abrir editores ou formatar planilhas. A EnergivIA gera
                    a proposta personalizada com a marca da sua empresa, gráficos de ROI, simulação
                    bancária e botão de aceite digital.
                  </p>
                  <div className="pt-2 flex flex-col gap-2 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Taxa média de fechamento 42% maior pelo tempo de resposta</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Link web interativo + PDF de alta resolução com sua marca</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => handleStepClick("fatura")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors"
                    >
                      <span>Voltar ao início: Leitura da Fatura</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Browser Footer Status Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-[#09101d] px-4 py-2.5 sm:px-6 text-xs text-slate-400 rounded-b-xl sm:rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Operação em Tempo Real
            </span>
            <span className="hidden sm:inline-block text-slate-700">•</span>
            <span className="hidden sm:inline-block text-slate-400">
              Tempo médio de resposta do integrador:{" "}
              <b className="text-amber-300">&lt; 2 minutos</b>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Clique nas etapas acima para navegar pelo fluxo
          </div>
        </div>
      </motion.div>
    </div>
  );
}
