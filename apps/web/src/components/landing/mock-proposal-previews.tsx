"use client";

import React from "react";
import {
  Sun,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

export type ProposalMockType = "residential" | "commercial" | "usinas" | "industrial" | "whatsapp";

interface MockProposalPreviewProps {
  type: ProposalMockType;
  clientName?: string;
  compact?: boolean;
  className?: string;
}

interface TemplateConfig {
  badge: string;
  badgeColor: string;
  title: string;
  highlight: string;
  clientName: string;
  themeGradient: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  tagColor: string;
  metrics: {
    power: string;
    generation: string;
    savings: string;
    payback: string;
  };
  solutionTitle: string;
  solutionDesc: string;
  solutionTags: string[];
}

function getTemplateConfig(type: ProposalMockType, clientName?: string): TemplateConfig {
  switch (type) {
    case "residential":
      return {
        badge: "Template Residencial",
        badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        title: "Proposta de Energia Solar Fotovoltaica",
        highlight: "Residencial Express",
        clientName: clientName || "Família Santana",
        themeGradient: "from-[#04281f] via-[#021813] to-[#02040a]",
        accentBg: "bg-emerald-950/40",
        accentBorder: "border-emerald-500/30",
        accentText: "text-emerald-400",
        tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
        metrics: {
          power: "5.5 kWp",
          generation: "715 kWh/mês",
          savings: "R$ 680/mês",
          payback: "2,8 anos",
        },
        solutionTitle: "Gerador Solar On-Grid 5.5 kWp",
        solutionDesc:
          "10 módulos monocristalinos 550W de alta eficiência com microinversor inteligente.",
        solutionTags: ["Garantia 25 anos", "Monitoramento App", "Economia 92%"],
      };
    case "commercial":
      return {
        badge: "Template Comercial B3",
        badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        title: "Estudo de Eficiência Energética & Tarifa B3",
        highlight: "Comercial · Tarifa B3",
        clientName: clientName || "Supermercado Central",
        themeGradient: "from-[#042038] via-[#021324] to-[#02040a]",
        accentBg: "bg-sky-950/40",
        accentBorder: "border-sky-500/30",
        accentText: "text-sky-400",
        tagColor: "bg-sky-500/15 text-sky-300 border-sky-500/20",
        metrics: {
          power: "34.2 kWp",
          generation: "4.400 kWh/mês",
          savings: "R$ 4.350/mês",
          payback: "2,3 anos",
        },
        solutionTitle: "Usina Solar Comercial 34.2 kWp",
        solutionDesc:
          "62 módulos Tier 1 e inversor trifásico 30kW com proteção integrada anti-ilhamento.",
        solutionTags: ["TIR 38,4% a.a.", "Telemetria B3", "Otimização OPEX"],
      };
    case "usinas":
    case "industrial":
      return {
        badge: "Template Usina Solo",
        badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        title: "Usina Fotovoltaica & Autoconsumo Remoto",
        highlight: "Usina Solo · 185 kWp",
        clientName: clientName || "Usina Solar Horizonte",
        themeGradient: "from-[#220738] via-[#140424] to-[#02040a]",
        accentBg: "bg-purple-950/40",
        accentBorder: "border-purple-500/30",
        accentText: "text-purple-400",
        tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/20",
        metrics: {
          power: "185 kWp",
          generation: "24.500 kWh/mês",
          savings: "R$ 22.800/mês",
          payback: "2,1 anos",
        },
        solutionTitle: "Usina Solar de Solo 185 kWp",
        solutionDesc: "336 módulos bifaciais com ganho de albedo e subestação blindada dedicada.",
        solutionTags: ["ROI +418%", "Rateio de Créditos", "Telemetria Satélite"],
      };
    case "whatsapp":
    default:
      return {
        badge: "Template WhatsApp",
        badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        title: "Proposta Solar Digital Instantânea",
        highlight: "Conversão WhatsApp · 8.2 kWp",
        clientName: clientName || "Dr. Marcos Silveira",
        themeGradient: "from-[#04281f] via-[#021813] to-[#02040a]",
        accentBg: "bg-emerald-950/40",
        accentBorder: "border-emerald-500/30",
        accentText: "text-emerald-400",
        tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
        metrics: {
          power: "8.2 kWp",
          generation: "1.050 kWh/mês",
          savings: "R$ 940/mês",
          payback: "2,6 anos",
        },
        solutionTitle: "Gerador Fotovoltaico 8.2 kWp",
        solutionDesc:
          "Proposta gerada em 45 segundos via WhatsApp com link interativo e aceite digital.",
        solutionTags: ["Aceite Digital", "Entrada Zero", "Economia Imediata"],
      };
  }
}

export function MockProposalPreview({
  type,
  clientName,
  compact = false,
  className = "",
}: MockProposalPreviewProps): JSX.Element {
  const cfg = React.useMemo(() => getTemplateConfig(type, clientName), [type, clientName]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none rounded-2xl bg-[#03060c] border border-white/10 shadow-2xl flex flex-col ${className}`}
    >
      {/* Top Browser/Viewer Mockup Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#070b14]/95 px-3 py-1.5 z-20 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1 shrink-0">
            <span className="h-2 w-2 rounded-full bg-rose-500/80" />
            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-medium text-slate-300 truncate tracking-tight">
            {cfg.title}
          </span>
        </div>
        <span
          className={`text-[8px] shrink-0 font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${cfg.badgeColor}`}
        >
          {cfg.badge}
        </span>
      </div>

      {/* Proposal Body Preview - Pure Lightweight CSS, 0 JS overhead */}
      <div
        className={`relative flex-1 overflow-hidden p-3.5 sm:p-4 bg-gradient-to-b ${cfg.themeGradient} flex flex-col justify-between`}
      >
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/[0.03] blur-2xl" />

        {/* Header Block */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border uppercase ${cfg.tagColor}`}
            >
              <Zap className="h-2.5 w-2.5" />
              {cfg.highlight}
            </span>
            <span className="text-[9px] font-mono text-slate-400">EnergivIA Pro</span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug line-clamp-2">
            {cfg.title}
          </h4>
          <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-300 font-light truncate">
            Preparado com IA para{" "}
            <strong className="font-semibold text-white">{cfg.clientName}</strong>
          </p>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="my-2.5 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Potência</span>
              <Sun className={`h-2.5 w-2.5 ${cfg.accentText}`} />
            </div>
            <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-white tracking-tight">
              {cfg.metrics.power}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Geração Est.</span>
              <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
            </div>
            <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-emerald-300 tracking-tight">
              {cfg.metrics.generation}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Economia</span>
              <DollarSign className="h-2.5 w-2.5 text-emerald-400" />
            </div>
            <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-emerald-300 tracking-tight">
              {cfg.metrics.savings}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Payback</span>
              <ArrowUpRight className={`h-2.5 w-2.5 ${cfg.accentText}`} />
            </div>
            <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-white tracking-tight">
              {cfg.metrics.payback}
            </p>
          </div>
        </div>

        {/* Solution Feature Highlight Card */}
        <div
          className={`rounded-xl border ${cfg.accentBorder} ${cfg.accentBg} p-2.5 sm:p-3 shadow-inner`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className={`h-3 w-3 shrink-0 ${cfg.accentText}`} />
              <p className="text-[10px] sm:text-xs font-semibold text-white truncate">
                {cfg.solutionTitle}
              </p>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
              Tier 1
            </span>
          </div>

          {!compact && (
            <p className="text-[9px] sm:text-[10px] text-slate-300 font-light leading-relaxed line-clamp-2">
              {cfg.solutionDesc}
            </p>
          )}

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {cfg.solutionTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-medium text-slate-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md"
              >
                <CheckCircle2 className="h-2 w-2 text-emerald-400" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
