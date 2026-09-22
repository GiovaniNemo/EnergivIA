"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2, Home, Layers, MessageSquare, SunMedium, Sparkles } from "lucide-react";
import { MockProposalPreview, type ProposalMockType } from "./mock-proposal-previews";

interface PanelData {
  id: number;
  title: string;
  badge: string;
  mockType: ProposalMockType;
  clientName: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  tag: string;
}

const panels: PanelData[] = [
  {
    id: 1,
    title: "Residencial",
    badge: "PROPOSTAS EM MINUTOS",
    mockType: "residential",
    clientName: "Residencial Família Santana",
    icon: Home,
    accentColor: "from-emerald-400 to-teal-400",
    tag: "Alta Conversão",
  },
  {
    id: 2,
    title: "Comercial",
    badge: "ANÁLISE TÉCNICA E TARIFA",
    mockType: "commercial",
    clientName: "Supermercado Central",
    icon: Building2,
    accentColor: "from-cyan-400 to-blue-400",
    tag: "Engenharia & Payback",
  },
  {
    id: 3,
    title: "Usinas e Autoconsumo",
    badge: "CRIAÇÃO DE CENÁRIOS E ROI",
    mockType: "usinas",
    clientName: "Usina Solar Horizonte",
    icon: SunMedium,
    accentColor: "from-blue-400 to-indigo-400",
    tag: "Grandes Projetos",
  },
  {
    id: 4,
    title: "Operação no WhatsApp",
    badge: "CONVERSÃO EM TEMPO REAL",
    mockType: "whatsapp",
    clientName: "Dr. Marcos Silveira",
    icon: MessageSquare,
    accentColor: "from-teal-400 to-emerald-400",
    tag: "Mobile First",
  },
];

function PanelCard({ panel, index }: { panel: PanelData; index: number }) {
  const Icon = panel.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.55,
        delay: 0.08 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -6,
        transition: { duration: 0.2 },
      }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#070b14]/85 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_35px_rgba(56,189,248,0.14)]"
    >
      {/* Top subtle highlight on hover */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Preview Container - Clean, crisp and fully visible without heavy obscuring masks */}
      <div className="relative h-[390px] sm:h-[425px] w-full overflow-hidden bg-[#03060c] p-2.5 sm:p-3 pb-16 sm:pb-20">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.015]">
          <MockProposalPreview type={panel.mockType} clientName={panel.clientName} />
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] group-hover:shadow-[inset_0_0_20px_rgba(56,189,248,0.12)] transition-shadow duration-500" />
      </div>

      {/* Bottom Info Bar - Transparent gradient so proposal content above is crisp and readable */}
      <div className="pointer-events-none absolute bottom-0 left-0 w-full p-5 sm:p-6 z-30 bg-gradient-to-t from-[#040711] via-[#040711]/90 to-transparent flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider text-cyan-400 uppercase">
              {panel.badge}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white sm:text-2xl group-hover:text-cyan-200 transition-colors">
            {panel.title}
          </h3>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-mono text-slate-300">
          <Sparkles className="h-3 w-3 text-cyan-400" />
          {panel.tag}
        </span>
      </div>
    </motion.article>
  );
}

export function ConvergingPanelsSection() {
  return (
    <section
      id="cenarios"
      className="relative overflow-hidden border-y border-white/5 bg-[#02040a] px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center mb-14 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Modelos de Negócio Adaptáveis
          </span>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Cenários Ilimitados
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-light leading-relaxed">
            Da residência à usina de investimento, nossas soluções se adaptam a qualquer modelo de
            negócio com performance excepcional.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {panels.map((panel, index) => (
            <PanelCard key={panel.id} panel={panel} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
