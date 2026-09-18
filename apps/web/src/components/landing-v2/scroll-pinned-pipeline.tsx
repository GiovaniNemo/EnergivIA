"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Scan,
  Cpu,
  Layers,
  Send,
  Zap,
  CheckCircle2,
  FileText,
  ShieldCheck,
  TrendingUp,
  Activity,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export function ScrollPinnedPipeline(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Numeric step state for indicators (0, 1, 2, 3)
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.28) setActiveStep(0);
      else if (latest < 0.54) setActiveStep(1);
      else if (latest < 0.78) setActiveStep(2);
      else setActiveStep(3);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Phase 1: OCR Scanner animations
  const p1Opacity = useTransform(scrollYProgress, [0, 0.22, 0.28], [1, 1, 0]);
  const p1Scale = useTransform(scrollYProgress, [0, 0.24, 0.28], [1, 0.98, 0.9]);
  const p1Y = useTransform(scrollYProgress, [0, 0.28], [0, -40]);

  // Phase 2: AI Kinetic Engine animations
  const p2Opacity = useTransform(scrollYProgress, [0.22, 0.28, 0.48, 0.54], [0, 1, 1, 0]);
  const p2Scale = useTransform(scrollYProgress, [0.22, 0.3, 0.48, 0.54], [0.92, 1, 1, 0.9]);
  const p2Y = useTransform(scrollYProgress, [0.22, 0.3, 0.54], [40, 0, -40]);

  // Phase 3: 3D Unfolding Proposal Deck animations
  const p3Opacity = useTransform(scrollYProgress, [0.48, 0.54, 0.72, 0.78], [0, 1, 1, 0]);
  const p3Scale = useTransform(scrollYProgress, [0.48, 0.56, 0.72, 0.78], [0.9, 1, 1, 0.9]);
  const p3Y = useTransform(scrollYProgress, [0.48, 0.56, 0.78], [40, 0, -40]);

  // Phase 4: WhatsApp Omni-Channel Dispatch
  const p4Opacity = useTransform(scrollYProgress, [0.72, 0.78, 1], [0, 1, 1]);
  const p4Scale = useTransform(scrollYProgress, [0.72, 0.8, 1], [0.92, 1, 1]);
  const p4Y = useTransform(scrollYProgress, [0.72, 0.8], [40, 0]);

  // Unfolding sub-cards transforms for Phase 3
  const deckCard1X = useTransform(scrollYProgress, [0.54, 0.68], [-120, -190]);
  const deckCard1Rotate = useTransform(scrollYProgress, [0.54, 0.68], [-6, -12]);
  const deckCard3X = useTransform(scrollYProgress, [0.54, 0.68], [120, 190]);
  const deckCard3Rotate = useTransform(scrollYProgress, [0.54, 0.68], [6, 12]);

  const stepsData = [
    {
      id: "ocr",
      badge: "Passo 01",
      title: "Telemetria & Leitura OCR",
      desc: "IA escaneia a conta de luz, extrai histórico de consumo, tarifa e irradiação solar em milissegundos.",
      icon: Scan,
      color: "from-cyan-500 to-blue-500",
    },
    {
      id: "engine",
      badge: "Passo 02",
      title: "Motor Solar & Dimensionamento",
      desc: "Combinação algorítmica de inversores, módulos N-Type, fator de sobrecarga e geração mensal estimada.",
      icon: Cpu,
      color: "from-amber-500 to-emerald-500",
    },
    {
      id: "unfolding",
      badge: "Passo 03",
      title: "Desdobramento 3D da Proposta",
      desc: "Documento executivo, projeto técnico e retorno financeiro montados automaticamente em camadas dinâmicas.",
      icon: Layers,
      color: "from-emerald-400 to-teal-400",
    },
    {
      id: "dispatch",
      badge: "Passo 04",
      title: "Disparo no WhatsApp & Fechamento",
      desc: "O cliente recebe a proposta em PDF e o link interativo no WhatsApp em menos de 1 minuto.",
      icon: Send,
      color: "from-emerald-500 to-green-500",
    },
  ];

  return (
    <section
      id="pipeline"
      ref={containerRef}
      className="relative min-h-[400vh] bg-slate-950 text-white"
    >
      {/* Sticky Fullscreen Experience */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 py-8 sm:px-8">
        {/* Subtle grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[340px] w-[800px] rounded-full bg-gradient-to-b from-emerald-500/20 via-cyan-500/10 to-transparent blur-[140px]" />

        {/* Top Header HUD Bar */}
        <div className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/[0.08] pb-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Zap className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                PIPELINE DE ALTA PERFORMANCE
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Da Conta de Luz ao Fechamento com IA
              </h3>
            </div>
          </div>

          {/* Stepper indicators */}
          <div className="hidden sm:flex items-center gap-2">
            {stepsData.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all duration-300 ${
                  activeStep === idx
                    ? "bg-white/10 border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "text-slate-500 border border-transparent"
                }`}
              >
                <span className="font-mono font-bold">0{idx + 1}</span>
                <span className="hidden md:inline font-medium">{step.title.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <Activity
              className="h-3.5 w-3.5 text-emerald-400 animate-spin"
              style={{ animationDuration: "6s" }}
            />
            <span>SCROLL INTERATIVO</span>
          </div>
        </div>

        {/* Main Central Canvas Stage */}
        <div className="relative z-10 mx-auto flex h-[68vh] w-full max-w-6xl items-center justify-center">
          {/* =================================================== */}
          {/* STAGE 1: OCR SCANNER (Conta de Luz)                */}
          {/* =================================================== */}
          <motion.div
            style={{ opacity: p1Opacity, scale: p1Scale, y: p1Y }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto relative grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left: Holographic Bill Scan */}
              <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl">
                {/* Laser sweep bar */}
                <div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"
                  style={{
                    animation: "laserScan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                    top: "35%",
                  }}
                />

                {/* Cyber HUD Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Scan className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono tracking-wider text-cyan-300">
                      OCR_SCANNER_v2.4
                    </span>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                    CONTA_DETECTADA
                  </span>
                </div>

                {/* Mock Bill Visual */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-3 border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        Titular / Unidade
                      </div>
                      <div className="text-xs font-bold text-slate-200">
                        Indústria Solar Brasil Ltda
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        Concessionária
                      </div>
                      <div className="text-xs font-bold text-emerald-400">COPEL - Grupo B</div>
                    </div>
                  </div>

                  {/* Telemetry Extraction Pills */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5">
                      <div className="text-[10px] font-mono text-cyan-400">CONSUMO MÉDIO</div>
                      <div className="text-base font-bold text-white">
                        1.480 <span className="text-xs text-slate-400">kWh/mês</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5">
                      <div className="text-[10px] font-mono text-amber-400">VALOR ATUAL</div>
                      <div className="text-base font-bold text-white">R$ 1.391,20</div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                      <div className="text-[10px] font-mono text-emerald-400">IRRADIAÇÃO (HSP)</div>
                      <div className="text-base font-bold text-white">
                        4.92 <span className="text-xs text-slate-400">h/dia</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-2.5">
                      <div className="text-[10px] font-mono text-blue-400">TARIFA ENERGIA</div>
                      <div className="text-base font-bold text-white">
                        R$ 0,94 <span className="text-xs text-slate-400">/kWh</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Leitura realizada com 99.8% de precisão</span>
                  </div>
                </div>
              </div>

              {/* Right: Narrative Text */}
              <div className="text-left space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono text-cyan-300">
                  <Scan className="h-3.5 w-3.5" />
                  01. INGESTÃO & LEITURA INSTANTÂNEA
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Chega de digitar conta de luz manualmente.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Basta arrastar a fatura em PDF ou foto pelo WhatsApp. O motor de visão
                  computacional da EnergivIA identifica histórico de 12 meses, tarifas tusd/te, tipo
                  de ligação (bifásica/trifásica) e irradiação solar precisa.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Reconhece 100% das concessionárias brasileiras
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =================================================== */}
          {/* STAGE 2: AI KINETIC ENGINE (Exploded Solar Spec)   */}
          {/* =================================================== */}
          <motion.div
            style={{ opacity: p2Opacity, scale: p2Scale, y: p2Y }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto relative grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left: Narrative Text */}
              <div className="text-left space-y-4 order-2 md:order-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono text-amber-300">
                  <Cpu className="h-3.5 w-3.5" />
                  02. MOTOR DE CÁLCULO E ENGENHARIA
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Dimensionamento elétrico em segundos, sem erro de fórmula.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  O algoritmo calcula a potência de pico ideal (kWp), taxa de desempenho (PR),
                  orientação solar ótima e casa o melhor kit de distribuidores parceiros com menor
                  custo por watt.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Simulação de Geração 25 anos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Fator de Sobredimensionamento</span>
                  </div>
                </div>
              </div>

              {/* Right: Exploded Solar System Spec HUD */}
              <div className="order-1 md:order-2 relative mx-auto w-full max-w-[360px] sm:max-w-[400px] rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-[0_0_50px_rgba(245,158,11,0.15)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu
                      className="h-4 w-4 text-amber-400 animate-spin"
                      style={{ animationDuration: "8s" }}
                    />
                    <span className="text-xs font-mono tracking-wider text-amber-300">
                      SOLAR_ENGINE_CALCULUS
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    OTIMIZAÇÃO 100%
                  </span>
                </div>

                {/* Exploded System Stack */}
                <div className="mt-4 space-y-2.5">
                  {/* Item 1: Módulos */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3 hover:border-amber-400/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">18x Módulos 580W N-Type</div>
                        <div className="text-[10px] text-slate-400">
                          Eficiência 22.6% • Bifacial
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">10.44 kWp</span>
                  </div>

                  {/* Item 2: Inversor */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3 hover:border-emerald-400/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Inversor 8.0 kW Híbrido</div>
                        <div className="text-[10px] text-slate-400">
                          Dual MPPT • 98.4% Rendimento
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300">FDI 1.30</span>
                  </div>

                  {/* Item 3: Geração Mensal */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3 hover:border-cyan-400/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Geração Média Estimada</div>
                        <div className="text-[10px] text-slate-400">105% Cobertura de Consumo</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-300">1.554 kWh/mês</span>
                  </div>
                </div>

                {/* Energy graph preview mini bar */}
                <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                    <span>CURVA DE GERAÇÃO ANUAL</span>
                    <span className="text-emerald-400">+18.648 kWh/ano</span>
                  </div>
                  <div className="flex h-8 items-end gap-1">
                    {[65, 75, 85, 90, 80, 70, 72, 88, 95, 100, 92, 84].map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-amber-500 to-emerald-400 opacity-80"
                        style={{ height: `${val}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =================================================== */}
          {/* STAGE 3: 3D UNFOLDING PROPOSAL DECK (InfinitePapers)*/}
          {/* =================================================== */}
          <motion.div
            style={{ opacity: p3Opacity, scale: p3Scale, y: p3Y }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto relative flex flex-col items-center justify-center w-full max-w-5xl">
              {/* Header narrative */}
              <div className="text-center max-w-2xl mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono text-emerald-300 mb-2">
                  <Layers className="h-3.5 w-3.5" />
                  03. DESDOBRAMENTO 3D EM CAMADAS
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Propostas que encantam e fecham contratos.
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  O cliente recebe um documento interativo completo: visualização financeira, layout
                  dos equipamentos e comparativo de retorno.
                </p>
              </div>

              {/* 3D Unfolding Deck Perspective Container */}
              <div
                className="relative flex items-center justify-center w-full h-[320px] sm:h-[350px]"
                style={{ perspective: 1200 }}
              >
                {/* Left Card: Engineering Layout */}
                <motion.div
                  style={{ x: deckCard1X, rotateZ: deckCard1Rotate }}
                  className="hidden md:block absolute w-[240px] sm:w-[270px] h-[310px] rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-transform"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-mono text-slate-400">PLANTA TÉCNICA</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-24 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex flex-col items-center justify-center p-2 text-center">
                      <div className="grid grid-cols-6 gap-1 w-full max-w-[160px]">
                        {Array.from({ length: 18 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="h-3 rounded-sm bg-gradient-to-b from-cyan-500/60 to-blue-600/60 border border-cyan-400/40"
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-cyan-300 mt-2">
                        Arranjo Fotovoltaico 10.4 kWp
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Área de Telhado:</span>
                        <span className="font-bold">48 m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peso Estimado:</span>
                        <span className="font-bold">450 kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Garantia Painéis:</span>
                        <span className="font-bold text-emerald-400">25 anos</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Center Main Card: Executive Proposal */}
                <div className="relative z-20 w-[300px] sm:w-[340px] h-[330px] rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_25px_60px_rgba(16,185,129,0.25)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                        ⚡
                      </div>
                      <span className="text-xs font-bold text-white">PROPOSTA COMERCIAL</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      PRONTA
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Economia Estimada em 25 anos
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                        R$ 384.200
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left pt-1">
                      <div className="rounded-lg bg-white/[0.04] p-2 border border-white/5">
                        <div className="text-[10px] text-slate-400">Payback</div>
                        <div className="text-sm font-bold text-white">2.8 anos</div>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] p-2 border border-white/5">
                        <div className="text-[10px] text-slate-400">TIR Anual</div>
                        <div className="text-sm font-bold text-emerald-400">38.4% a.a.</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-[10px] text-emerald-300 font-medium">
                          Valor da Parcela
                        </div>
                        <div className="text-xs font-bold text-white">
                          R$ 840,00{" "}
                          <span className="text-[10px] text-slate-400 font-normal">/mês</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-950 bg-emerald-400 px-2.5 py-1 rounded-md">
                        Menor que a conta!
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Financial Payback Breakdown */}
                <motion.div
                  style={{ x: deckCard3X, rotateZ: deckCard3Rotate }}
                  className="hidden md:block absolute w-[240px] sm:w-[270px] h-[310px] rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-transform"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-mono text-slate-400">RETORNO FINANCEIRO</span>
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-3 space-y-3 text-left">
                    <div className="h-20 rounded-lg bg-cyan-950/30 border border-cyan-500/20 p-2 flex items-end gap-1.5">
                      {[20, 35, 55, 75, 95].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-emerald-400"
                            style={{ height: `${val}%` }}
                          />
                          <span className="text-[8px] font-mono text-slate-400">Ano {idx + 1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Investimento Total:</span>
                        <span className="font-bold">R$ 29.800</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Economia no Ano 1:</span>
                        <span className="font-bold text-emerald-400">R$ 14.890</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valorização Imóvel:</span>
                        <span className="font-bold">+8% a 12%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* =================================================== */}
          {/* STAGE 4: WHATSAPP DISPATCH & CLOSING               */}
          {/* =================================================== */}
          <motion.div
            style={{ opacity: p4Opacity, scale: p4Scale, y: p4Y }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto relative grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left: Interactive Phone Mockup */}
              <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[350px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-3 shadow-[0_25px_60px_rgba(16,185,129,0.2)]">
                {/* Speaker pill */}
                <div className="mx-auto h-4 w-28 rounded-full bg-slate-800 mb-2" />

                {/* WhatsApp Chat UI */}
                <div className="rounded-[28px] overflow-hidden bg-[#0b141a] text-slate-100 flex flex-col h-[380px] border border-white/5">
                  {/* WhatsApp Top Bar */}
                  <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      EV
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-bold text-slate-100">EnergivIA Soluções</div>
                      <div className="text-[10px] text-emerald-400">online agora</div>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto text-left text-xs">
                    <div className="rounded-lg bg-[#1f2c34] p-2.5 max-w-[85%] text-slate-200">
                      Olá Carlos! Analisamos sua conta de luz da Copel. Sua proposta solar
                      personalizada está pronta! ⚡
                      <span className="block text-[9px] text-slate-400 text-right mt-1">14:32</span>
                    </div>

                    {/* PDF Attachment card */}
                    <div className="rounded-xl bg-[#005c4b] p-3 max-w-[90%] text-white shadow-md">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-7 w-7 text-amber-300 shrink-0" />
                        <div className="overflow-hidden">
                          <div className="font-bold text-xs truncate">
                            Proposta_Solar_Carlos.pdf
                          </div>
                          <div className="text-[10px] text-emerald-200">1.4 MB • 6 páginas</div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-emerald-100">
                        <span>Abrir Proposta</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>

                    {/* Simulation link action */}
                    <div className="rounded-lg bg-[#1f2c34] p-2.5 max-w-[88%] text-slate-200">
                      Você pode conferir a simulação interativa e assinar digitalmente aqui:
                      <div className="mt-1 font-mono text-[11px] text-cyan-400 underline">
                        proposta.energiv.ia/p/7x90b
                      </div>
                    </div>
                  </div>

                  {/* Quick action bar */}
                  <div className="bg-[#1f2c34] p-2.5 flex items-center gap-2">
                    <button className="flex-1 rounded-full bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
                      Aceitar Proposta 🚀
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Narrative Text */}
              <div className="text-left space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono text-emerald-300">
                  <Send className="h-3.5 w-3.5" />
                  04. VELOCIDADE QUE CONVERTE
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Envie a proposta enquanto seu concorrente ainda abre a planilha.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Estudos no mercado solar mostram que propostas enviadas nos primeiros 15 minutos
                  têm até <strong>4x mais chances de fechamento</strong>. Com a EnergivIA, seu
                  cliente recebe tudo no WhatsApp no exato momento do interesse.
                </p>
                <div className="pt-2">
                  <a
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105 transition-all"
                  >
                    <span>Testar Gratuitamente</span>
                    <Sparkles className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Interactive Navigation & Progress Bar */}
        <div className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between pt-4 border-t border-white/[0.08]">
          <div className="text-xs text-slate-400">
            <span className="font-mono text-emerald-400 font-bold">
              Etapa {activeStep + 1} de 4
            </span>{" "}
            — {stepsData[activeStep].title}
          </div>

          <div className="flex items-center gap-1.5">
            {stepsData.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeStep === idx ? "w-8 bg-emerald-400" : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
