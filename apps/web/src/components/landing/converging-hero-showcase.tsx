"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { FileText, Sun, Zap, CheckCircle2, TrendingUp, Sparkles, Smartphone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

type ShowcaseStep = "fatura" | "dimensionamento" | "proposta";

export function ConvergingHeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ShowcaseStep>("dimensionamento");
  const [autoPlay, setAutoPlay] = useState<boolean>(true);

  // Scroll-driven 3D tilt & smooth scaling effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  // Perspective tilt on scroll: starts slightly pitched back and scales into full crisp view
  const rotateX = useTransform(smoothProgress, [0, 1], [14, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(smoothProgress, [0, 0.4, 1], [0.4, 0.9, 1]);
  const y = useTransform(smoothProgress, [0, 1], [60, 0]);

  // Gentle auto-rotation between steps if user hasn't clicked
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "fatura") return "dimensionamento";
        if (prev === "dimensionamento") return "proposta";
        return "fatura";
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [autoPlay]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-10 w-full max-w-[1140px] px-2 sm:px-4"
      style={{ perspective: 1200 }}
    >
      {/* Sunlight ambient halo hitting the top of the browser frame */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-3/4 max-w-2xl rounded-full bg-gradient-to-b from-amber-400/15 via-emerald-400/10 to-transparent blur-3xl" />

      {/* Floating Solar Stat Card - Left Side (Sunlight Metric) */}
      <motion.div
        initial={{ opacity: 0, x: -50, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.4 }}
        className="hidden lg:flex absolute -left-12 top-24 z-30 flex-col gap-1 rounded-2xl border border-amber-400/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Geração Solar
            </p>
            <p className="text-base font-bold text-white">315 kWh/mês</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>100% de economia na fatura</span>
        </div>
      </motion.div>

      {/* Floating Speed & WhatsApp Card - Right Side */}
      <motion.div
        initial={{ opacity: 0, x: 50, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.6 }}
        className="hidden lg:flex absolute -right-10 bottom-28 z-30 flex-col gap-1 rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <FaWhatsapp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Tempo de Resposta
            </p>
            <p className="text-base font-bold text-white">&lt; 2 minutos</p>
          </div>
        </div>
        <p className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Proposta pronta para fechar</span>
        </p>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* ENTERPRISE BROWSER APPLICATION WINDOW                         */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        style={{
          rotateX,
          scale,
          opacity,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-[#0C111C] shadow-[0_24px_60px_rgba(0,0,0,0.8)]"
      >
        {/* Browser Chrome Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/90 bg-[#0F1626] px-4 py-3 sm:px-6">
          {/* Traffic Light Dots */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#EF4444]/80" />
            <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
            <div className="h-3 w-3 rounded-full bg-[#10B981]" />
            <div className="ml-3 hidden sm:flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 font-mono">
              <span className="text-emerald-400">https://</span>
              <span>app.energivia.com.br/painel</span>
            </div>
          </div>

          {/* Real-time Status Pills */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IA Ativa
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              <Sun className="h-3 w-3 text-amber-400" />
              Catálogo Dynamis
            </span>
          </div>
        </div>

        {/* 3-Step Interactive Pipeline Selector Bar */}
        <div className="border-b border-slate-800/80 bg-slate-950/60 p-2 sm:p-2.5">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "fatura" as ShowcaseStep,
                step: "1",
                label: "Leitura da Fatura",
                desc: "Extração OCR de consumo e tarifa",
                icon: FileText,
                accentColor: "border-amber-400/40 text-amber-400",
              },
              {
                id: "dimensionamento" as ShowcaseStep,
                step: "2",
                label: "Motor Solar & Kit",
                desc: "Dimensionamento 3,15 kWp e ROI",
                icon: Sun,
                accentColor: "border-emerald-400/40 text-emerald-400",
              },
              {
                id: "proposta" as ShowcaseStep,
                step: "3",
                label: "Envio no WhatsApp",
                desc: "PDF gerado e link comercial",
                icon: FaWhatsapp,
                accentColor: "border-teal-400/40 text-teal-400",
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setAutoPlay(false);
                  }}
                  className={`flex flex-col sm:flex-row items-center sm:items-start gap-2 rounded-xl p-2.5 sm:p-3 text-left transition-all duration-200 ${
                    isActive
                      ? "border border-amber-400/40 bg-slate-800/90 text-white shadow-md shadow-amber-950/20"
                      : "border border-transparent bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {tab.label}
                    </p>
                    <p className="hidden sm:block text-[10.5px] text-slate-400 truncate mt-0.5">
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Screen Stage Content */}
        <div className="relative min-h-[380px] sm:min-h-[430px] p-4 sm:p-7 bg-[#0A0E17]">
          <AnimatePresence mode="wait">
            {/* STEP 1: LEITURA DA FATURA COM IA */}
            {activeTab === "fatura" && (
              <motion.div
                key="tab-fatura"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 md:grid-cols-12 items-center"
              >
                {/* Visual Representation of Bill */}
                <div className="md:col-span-6 rounded-2xl border border-slate-800 bg-[#0E1524] p-4 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-400/15 text-[10px] font-bold text-amber-400">
                        PDF
                      </span>
                      <span className="text-xs font-semibold text-white">
                        Conta_Luz_Copel_092026.pdf
                      </span>
                    </div>
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Leitura Concluída (1.8s)
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Concessionária:</span>
                      <span className="font-bold text-white">Copel Distribuição (Paraná)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/90 p-2.5 rounded-xl border border-amber-400/30">
                      <span className="text-slate-400">Consumo Médio Extraído:</span>
                      <span className="font-extrabold text-amber-300 text-sm">315 kWh/mês</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Grupo Tarifário:</span>
                      <span className="font-bold text-white">B1 Residencial Convencional</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Tipo de Telhado:</span>
                      <span className="font-bold text-emerald-400">Cerâmico / Fibrocimento</span>
                    </div>
                  </div>
                </div>

                {/* Explanation Card */}
                <div className="md:col-span-6 space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Inteligência Artificial Nativa
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    O cliente manda a foto ou PDF, a IA extrai tudo
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Zero digitação manual. A EnergivIA identifica a concessionária, calcula o
                    histórico de 12 meses, detecta sazonalidades e prepara a base técnica em
                    segundos.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                      ✓ Compatível com todas as distribuidoras
                    </span>
                    <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                      ✓ Validação de titular e UC
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DIMENSIONAMENTO & MOTOR SOLAR */}
            {activeTab === "dimensionamento" && (
              <motion.div
                key="tab-dim"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 md:grid-cols-12 items-center"
              >
                {/* Visual Metric Dashboard */}
                <div className="md:col-span-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-amber-400/30 bg-[#0E1626] p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        Potência Recomendada
                      </span>
                      <Sun className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">3,15 kWp</p>
                    <p className="mt-1 text-[11px] text-amber-300/90 font-medium">
                      6x Módulos 580W N-Type
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/30 bg-[#0E1626] p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Economia Estimada</span>
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-400">
                      R$ 850<span className="text-sm font-normal text-slate-400">/mês</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-300 font-medium">
                      R$ 10.200 no 1º ano
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-4 shadow-sm">
                    <span className="text-xs font-medium text-slate-400">Geração Esperada</span>
                    <p className="mt-2 text-xl sm:text-2xl font-bold text-white">315 kWh/mês</p>
                    <p className="mt-1 text-[11px] text-amber-300/80">100% da meta de consumo</p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-4 shadow-sm">
                    <span className="text-xs font-medium text-slate-400">
                      Retorno do Investimento
                    </span>
                    <p className="mt-2 text-xl sm:text-2xl font-bold text-white">2.8 Anos</p>
                    <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                      Payback acelerado
                    </p>
                  </div>
                </div>

                {/* Technical Overview */}
                <div className="md:col-span-5 space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" />
                    Catálogo Integrado Dynamis
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Cálculo exato e kit correto em segundos
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    O motor solar da EnergivIA calcula a radiação solar da cidade, seleciona os
                    inversores e módulos ideais com estoque real e define margens de lucro
                    automáticas.
                  </p>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Custo do Kit Distribuidor:</span>
                      <span className="font-bold text-white">R$ 6.840,00</span>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-800">
                      <span className="text-slate-400">Preço de Venda Sugerido:</span>
                      <span className="font-extrabold text-amber-300">R$ 11.900,00</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PROPOSTA PRONTA NO WHATSAPP */}
            {activeTab === "proposta" && (
              <motion.div
                key="tab-prop"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 md:grid-cols-12 items-center"
              >
                {/* Proposal Mock Preview */}
                <div className="md:col-span-6 rounded-2xl border border-slate-800 bg-[#0E1524] p-5 shadow-inner space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Proposta Solar Comercial</p>
                        <p className="text-[10px] text-slate-400">Cliente: Marcelo Santana</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      Pronta para Envio
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-900/90 p-3 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sistema:</span>
                      <span className="font-bold text-white">3,15 kWp Fotovoltaico</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Investimento Total:</span>
                      <span className="font-extrabold text-amber-300">R$ 11.900,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Condição:</span>
                      <span className="font-bold text-emerald-400">
                        60x de R$ 268,00 no Santander
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                    >
                      <FaWhatsapp className="h-4 w-4" />
                      <span>Enviar Link ao Cliente</span>
                    </a>
                  </div>
                </div>

                {/* Explanation */}
                <div className="md:col-span-6 space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300">
                    <Smartphone className="h-3.5 w-3.5 text-teal-400" />
                    Fluxo 100% no WhatsApp
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Entrega profissional no canal onde o cliente fecha
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Seu cliente recebe uma proposta visual completa, interativa e profissional em
                    PDF ou link web personalizado com a sua marca, pronto para aprovação.
                  </p>
                  <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      <span>Comparações de economia antes e depois do sistema solar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Opções de financiamento bancário simuladas na hora</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Browser Footer Metrics Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-[#090D15] px-4 py-3 sm:px-6 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operação em Tempo Real
            </span>
            <span className="hidden sm:inline-block text-slate-600">•</span>
            <span className="hidden sm:inline-block text-slate-400">
              Taxa de conversão média: <b className="text-amber-300">+42%</b>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Clique nos passos acima para navegar</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
