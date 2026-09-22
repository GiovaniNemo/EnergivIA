"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import {
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  Workflow,
  Zap,
  Quote,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface MetricItem {
  id: string;
  value: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  tag: string;
}

const METRICS: MetricItem[] = [
  {
    id: "m1",
    value: "< 2 min",
    label: "Para gerar uma proposta completa",
    sublabel: "Extração por IA, dimensionamento e link comercial prontos.",
    icon: Clock,
    accentColor: "from-cyan-400 to-blue-500",
    tag: "Agilidade Total",
  },
  {
    id: "m2",
    value: "3 passos",
    label: "Da conta de luz ao PDF final",
    sublabel: "Envio da fatura, validação do kit e geração da proposta.",
    icon: Layers,
    accentColor: "from-blue-400 to-indigo-500",
    tag: "Sem Burocracia",
  },
  {
    id: "m3",
    value: "1 fluxo",
    label: "Chat, kit e proposta no mesmo canal",
    sublabel: "Tudo acontece diretamente no WhatsApp que o cliente usa.",
    icon: Workflow,
    accentColor: "from-cyan-400 to-emerald-400",
    tag: "Integrado",
  },
  {
    id: "m4",
    value: "No mesmo dia",
    label: "Primeira proposta após configurar",
    sublabel: "Setup rápido para sua equipe começar a vender imediatamente.",
    icon: Zap,
    accentColor: "from-emerald-400 to-teal-500",
    tag: "Setup Rápido",
  },
];

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  location: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Antes levávamos horas para montar proposta. Hoje respondemos no mesmo atendimento e percebemos aumento real de fechamento.",
    author: "Rafael Martins",
    role: "Diretor Comercial",
    company: "Solar Horizonte",
    location: "Goiás",
  },
  {
    quote:
      "Reduzimos o tempo de envio da proposta de 2 dias para 5 minutos. O cliente recebe no WhatsApp antes mesmo de desligar a ligação.",
    author: "Camila Silveira",
    role: "Head de Operações",
    company: "Lumina Solar",
    location: "Paraná",
  },
  {
    quote:
      "A precisão do cálculo com os kits da distribuidora evita qualquer erro de margem. Fechamos 38% mais contratos no primeiro mês.",
    author: "Thiago Menezes",
    role: "Engenheiro & Integrador",
    company: "EnerVix Engenharia",
    location: "Minas Gerais",
  },
];

const PARTNERS = [
  "Solar Prime",
  "Energia+ Brasil",
  "Grupo Aurora",
  "Lumen Engenharia",
  "Voltz Solar",
  "EcoWatt Brasil",
  "Solarex Distribuidora",
];

export function ImpactResultsSection(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-80px" });

  const [activeTestimonial, setActiveTestimonial] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Mouse spotlight state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Testimonial auto-rotation
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handlePrevTestimonial = () => {
    setIsAutoPlaying(false);
    setActiveTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const handleNextTestimonial = () => {
    setIsAutoPlaying(false);
    setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  return (
    <section
      id="beneficios"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden border-t border-white/5 bg-[#02040a] px-4 py-20 sm:px-6 sm:py-24"
    >
      {/* Interactive Mouse Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-25 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(56, 189, 248, 0.12), transparent 70%)`,
        }}
      />

      {/* Ambient background blur elements */}
      <div className="pointer-events-none absolute top-1/4 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        {/* Section Header with Stagger Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
          >
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
            Resultados Comprovados
          </motion.span>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Impacto real na operação de integradores solares
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-light">
            Integradores em todo o Brasil usam a plataforma para responder mais rápido,
            profissionalizar propostas e converter mais vendas.
          </p>
        </motion.div>

        {/* 4 Interactive Animated Metric Cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 35 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 35 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  y: -6,
                  transition: { duration: 0.2 },
                }}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#070b14]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]"
              >
                {/* Subtle top glow highlight */}
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cyan-400 transition-colors duration-300 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-mono text-slate-400 border border-white/5">
                      {item.tag}
                    </span>
                  </div>

                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={isInView ? { scale: 1 } : { scale: 0.95 }}
                    transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                    className="mt-5"
                  >
                    <p
                      className={`text-3xl font-extrabold sm:text-4xl tracking-tight bg-gradient-to-r ${item.accentColor} bg-clip-text text-transparent`}
                    >
                      {item.value}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {item.label}
                    </h3>
                  </motion.div>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-slate-400 font-light leading-relaxed border-t border-white/5 pt-3">
                  {item.sublabel}
                </p>
              </motion.article>
            );
          })}
        </div>

        {/* Dynamic Animated Testimonials Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#070b14]/70 p-8 shadow-xl backdrop-blur-md"
        >
          {/* Subtle background gradient accent */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-2xl" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Quote className="h-6 w-6" />
              </div>

              <div className="min-h-[90px] flex flex-col justify-center flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                  >
                    <blockquote className="text-base text-slate-200 sm:text-lg font-light leading-relaxed">
                      "{TESTIMONIALS[activeTestimonial].quote}"
                    </blockquote>
                    <figcaption className="mt-3 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-cyan-300">
                        {TESTIMONIALS[activeTestimonial].author}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {TESTIMONIALS[activeTestimonial].role},{" "}
                        {TESTIMONIALS[activeTestimonial].company} (
                        {TESTIMONIALS[activeTestimonial].location})
                      </span>
                    </figcaption>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Testimonial Nav Arrows and Dots */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 mr-2">
                {TESTIMONIALS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setActiveTestimonial(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeTestimonial === idx
                        ? "w-6 bg-cyan-400"
                        : "w-1.5 bg-slate-700 hover:bg-slate-500"
                    }`}
                    aria-label={`Ver depoimento ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrevTestimonial}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                aria-label="Depoimento anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextTestimonial}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                aria-label="Próximo depoimento"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Partners Marquee with Infinite Motion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] py-5 px-4 backdrop-blur-xs"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Integradores e parceiros que confiam na operação
            </p>
          </div>

          <div className="relative flex overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
            <motion.div
              animate={{
                x: ["0%", "-50%"],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 22,
                  ease: "linear",
                },
              }}
              className="flex shrink-0 items-center gap-10 sm:gap-14 pr-10 sm:pr-14"
            >
              {[...PARTNERS, ...PARTNERS].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors duration-200 hover:text-cyan-300 whitespace-nowrap cursor-default"
                >
                  <Sparkles className="h-3 w-3 text-cyan-500/50" />
                  {name}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
