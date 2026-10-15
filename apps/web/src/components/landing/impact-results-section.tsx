"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import {
  Clock,
  Layers,
  TrendingUp,
  Workflow,
  Zap,
  Quote,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
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
    accentColor: "from-emerald-400 to-teal-500",
    tag: "Agilidade Total",
  },
  {
    id: "m2",
    value: "3 passos",
    label: "Da conta de luz ao PDF final",
    sublabel: "Envio da fatura, validação do kit e geração da proposta.",
    icon: Layers,
    accentColor: "from-teal-400 to-emerald-400",
    tag: "Sem Burocracia",
  },
  {
    id: "m3",
    value: "1 fluxo",
    label: "Chat, kit e proposta no mesmo canal",
    sublabel: "Tudo acontece diretamente no WhatsApp que o cliente usa.",
    icon: Workflow,
    accentColor: "from-emerald-400 to-lime-400",
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

export interface CaseStudy {
  id: string;
  quote: string;
  author: string;
  initials: string;
  role: string;
  company: string;
  city: string;
  uf: string;
  segment: string;
  installedCapacity: string;
  keyMetric: string;
  metricLabel: string;
  verifiedBadge: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "case-1",
    quote:
      "Nossa equipe de 6 consultores levava de 4 a 6 horas para dimensionar e gerar cada proposta comercial. Com a EnergivIA, entregamos simulações completas no WhatsApp no primeiro contato. Nossa taxa de fechamento subiu 38% já no primeiro trimestre.",
    author: "Rafael Martins",
    initials: "RM",
    role: "Diretor Comercial",
    company: "Solar Horizonte Engenharia",
    city: "Goiânia",
    uf: "GO",
    segment: "Comercial & Usinas de Solo",
    installedCapacity: "1.8 MWp instalados",
    keyMetric: "< 3 min",
    metricLabel: "Tempo médio de entrega",
    verifiedBadge: "Caso Verificado • Integrador Ativo",
  },
  {
    id: "case-2",
    quote:
      "A precisão da leitura automática da conta combinada com a apresentação executiva das opções Standard, Elite e Premium mudou o patamar da nossa empresa. O alerta de visualização permite que nossos vendedores liguem no momento exato em que o cliente está analisando o orçamento.",
    author: "Camila Silveira",
    initials: "CS",
    role: "Head de Operações",
    company: "Lumina Solar Sul",
    city: "Maringá",
    uf: "PR",
    segment: "Residencial B1 & PMEs",
    installedCapacity: "2.4 MWp instalados",
    keyMetric: "+42%",
    metricLabel: "Aumento em conversão",
    verifiedBadge: "Caso Verificado • Integrador Ativo",
  },
  {
    id: "case-3",
    quote:
      "O maior gargalo com consultores externos eram propostas com potências mal calculadas ou margens negativas em kits promocionais. Com os parâmetros centralizados na EnergivIA, blindamos a lucratividade da empresa e eliminamos 100% dos erros de orçamentação.",
    author: "Thiago Menezes",
    initials: "TM",
    role: "Engenheiro Eletricista & Sócio",
    company: "EnerVix Engenharia",
    city: "Uberlândia",
    uf: "MG",
    segment: "Industrial & Agronegócio",
    installedCapacity: "4.1 MWp instalados",
    keyMetric: "Zero erros",
    metricLabel: "Em margens e dimensionamento",
    verifiedBadge: "Caso Verificado • Integrador Ativo",
  },
  {
    id: "case-4",
    quote:
      "Escalamos de 2 para 9 consultores de vendas sem contratar nenhum orçamentista adicional para a retaguarda técnica. A plataforma unificou o WhatsApp, a simulação e o CRM, permitindo que cada vendedor atenda com qualidade mais de 15 clientes por dia.",
    author: "Luciana Barreto",
    initials: "LB",
    role: "Gerente Comercial",
    company: "Solarex Energia Nordeste",
    city: "Feira de Santana",
    uf: "BA",
    segment: "Residencial & Comercial B3",
    installedCapacity: "1.2 MWp instalados",
    keyMetric: "5x mais",
    metricLabel: "Propostas enviadas por dia",
    verifiedBadge: "Caso Verificado • Integrador Ativo",
  },
];

const PARTNERS = [
  { name: "Solar Horizonte", city: "Goiânia", uf: "GO" },
  { name: "Lumina Solar Sul", city: "Maringá", uf: "PR" },
  { name: "EnerVix Engenharia", city: "Uberlândia", uf: "MG" },
  { name: "Solarex Nordeste", city: "Feira de Santana", uf: "BA" },
  { name: "Aurora Energia", city: "Campinas", uf: "SP" },
  { name: "Voltz Engenharia Solar", city: "Cuiabá", uf: "MT" },
  { name: "EcoWatt Brasil", city: "Joinville", uf: "SC" },
  { name: "Lumen Soluções Solares", city: "Ribeirão Preto", uf: "SP" },
];

export function ImpactResultsSection(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-80px" });

  const [activeTestimonial, setActiveTestimonial] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Mouse spotlight direct DOM ref (0 React re-renders on mousemove)
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (!spotlightRef.current) return;
      const rect = currentTarget.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      spotlightRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.12), transparent 70%)`;
    });
  };

  // Testimonial auto-rotation
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % CASE_STUDIES.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handlePrevTestimonial = () => {
    setIsAutoPlaying(false);
    setActiveTestimonial((prev) => (prev - 1 + CASE_STUDIES.length) % CASE_STUDIES.length);
  };

  const handleNextTestimonial = () => {
    setIsAutoPlaying(false);
    setActiveTestimonial((prev) => (prev + 1) % CASE_STUDIES.length);
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
        ref={spotlightRef}
        className="pointer-events-none absolute -inset-px opacity-25 transition-opacity duration-300 will-change-contents"
        style={{
          background: `radial-gradient(600px circle at 50% 50%, rgba(16, 185, 129, 0.12), transparent 70%)`,
        }}
      />

      {/* Ambient background blur elements */}
      <div className="pointer-events-none absolute top-1/4 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 -right-40 h-96 w-96 rounded-full bg-teal-600/10 blur-3xl" />

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
            className="inline-flex items-center gap-1.5 rounded-full glass-pill border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
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
                className="group relative flex flex-col justify-between rounded-2xl glass-card glass-card-hover p-6"
              >
                {/* Subtle top glow highlight */}
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400 transition-colors duration-300 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
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
                    <h3 className="mt-2 text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
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

        {/* Dynamic Animated Verified Case Studies Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-10 overflow-hidden rounded-3xl glass-panel p-6 sm:p-9 border-white/10"
        >
          {/* Subtle background gradient accent */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              {/* Header: Verified badge + Location + Segment */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {CASE_STUDIES[activeTestimonial].verifiedBadge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400/80" />
                    {CASE_STUDIES[activeTestimonial].city} - {CASE_STUDIES[activeTestimonial].uf}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-0.5 text-xs font-mono text-slate-300 border border-white/10">
                    {CASE_STUDIES[activeTestimonial].segment}
                  </span>
                  <span className="rounded-full bg-emerald-950/40 px-3 py-0.5 text-xs font-mono text-emerald-300 border border-emerald-500/20">
                    {CASE_STUDIES[activeTestimonial].installedCapacity}
                  </span>
                </div>
              </div>

              {/* Main Content: Quote + Key Result Metric Card */}
              <div className="grid gap-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-8 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Quote className="h-6 w-6" />
                  </div>
                  <div>
                    <blockquote className="text-base sm:text-lg text-slate-200 font-light leading-relaxed">
                      "{CASE_STUDIES[activeTestimonial].quote}"
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950/70 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                        {CASE_STUDIES[activeTestimonial].initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {CASE_STUDIES[activeTestimonial].author}
                        </p>
                        <p className="text-xs text-slate-400 font-light">
                          {CASE_STUDIES[activeTestimonial].role},{" "}
                          <span className="text-slate-300 font-medium">
                            {CASE_STUDIES[activeTestimonial].company}
                          </span>
                        </p>
                      </div>
                    </figcaption>
                  </div>
                </div>

                {/* Highlighted Result Metric Box */}
                <div className="lg:col-span-4 rounded-2xl glass-card p-5 border-white/10 flex flex-col justify-center items-center text-center bg-gradient-to-br from-emerald-950/30 via-white/[0.02] to-transparent">
                  <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">
                    Resultado Auditado
                  </span>
                  <p className="mt-2 text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    {CASE_STUDIES[activeTestimonial].keyMetric}
                  </p>
                  <p className="mt-1 text-xs text-slate-300 font-light">
                    {CASE_STUDIES[activeTestimonial].metricLabel}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Bar: Switchers & Navigation */}
          <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {CASE_STUDIES.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveTestimonial(idx);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTestimonial === idx
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {c.company.split(" ")[0]} • {c.city}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevTestimonial}
                className="flex h-8 w-8 items-center justify-center rounded-full glass-pill text-slate-300 hover:text-white transition"
                aria-label="Caso anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextTestimonial}
                className="flex h-8 w-8 items-center justify-center rounded-full glass-pill text-slate-300 hover:text-white transition"
                aria-label="Próximo caso"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Partners Marquee with Regional Authenticity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 overflow-hidden rounded-2xl glass-panel py-5 px-4"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
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
                  duration: 25,
                  ease: "linear",
                },
              }}
              className="flex shrink-0 items-center gap-8 sm:gap-12 pr-8 sm:pr-12"
            >
              {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                <span
                  key={`${partner.name}-${i}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:text-emerald-300 whitespace-nowrap cursor-default"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                  <span>{partner.name}</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({partner.city}/{partner.uf})
                  </span>
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
