"use client";

import React from "react";
import {
  Zap,
  TrendingUp,
  Sun,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Building2,
  Home,
  Factory,
  Smartphone,
  Eye,
  Sparkles,
} from "lucide-react";

export type ProposalMockType = "residential" | "commercial" | "usinas" | "industrial" | "whatsapp";

interface MockProposalPreviewProps {
  type: ProposalMockType;
  clientName?: string;
  compact?: boolean;
  className?: string;
}

export function MockProposalPreview({
  type,
  clientName,
  compact = false,
  className = "",
}: MockProposalPreviewProps): JSX.Element {
  if (type === "residential") {
    return (
      <ResidentialMockProposal clientName={clientName} compact={compact} className={className} />
    );
  }
  if (type === "commercial") {
    return (
      <CommercialMockProposal clientName={clientName} compact={compact} className={className} />
    );
  }
  if (type === "usinas" || type === "industrial") {
    return <UsinasMockProposal clientName={clientName} compact={compact} className={className} />;
  }
  return <WhatsAppMockProposal clientName={clientName} compact={compact} className={className} />;
}

// -------------------------------------------------------------
// 1. MOCK PROPOSTA RESIDENCIAL
// -------------------------------------------------------------
function ResidentialMockProposal({
  clientName = "Família Santana",
  compact,
  className = "",
}: {
  clientName?: string;
  compact?: boolean;
  className?: string;
}) {
  const bars = [45, 52, 68, 75, 82, 95, 98, 92, 85, 78, 62, 50];

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-[#071318] p-3 sm:p-4 text-slate-100 font-sans shadow-2xl flex flex-col justify-between ${className}`}
    >
      {/* Glow background accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex items-center gap-1.5 pl-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
            <Home className="h-3 w-3 text-emerald-400" />
            <span>EnergivIA · Proposta Residencial</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
          <CheckCircle2 className="h-2.5 w-2.5" /> Pronta
        </span>
      </div>

      {/* Client & System Title */}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
            Cliente: {clientName}
          </p>
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            Sistema Fotovoltaico 5.5 kWp
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400">Payback</span>
          <p className="text-xs sm:text-sm font-bold text-emerald-400">2,8 anos</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-amber-400" /> Economia
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            R$ 680<span className="text-[9px] font-normal text-slate-400">/mês</span>
          </p>
          <span className="text-[8px] text-emerald-400 font-medium">≈ 92% redução</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5 text-sky-400" /> Investimento
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">R$ 18.900</p>
          <span className="text-[8px] text-slate-400 font-medium">10x R$ 1.890</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Sun className="h-2.5 w-2.5 text-emerald-400" /> Geração Est.
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            715 <span className="text-[9px] font-normal text-slate-400">kWh</span>
          </p>
          <span className="text-[8px] text-emerald-400 font-medium">10 painéis 550W</span>
        </div>
      </div>

      {/* Chart Section */}
      <div
        className={`mt-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 sm:p-2.5 ${compact ? "hidden sm:block" : ""}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-2.5 w-2.5 text-emerald-400" /> Curva de Geração Mensal (kWh)
          </span>
          <span className="text-[9px] text-slate-400">Média: 715 kWh/mês</span>
        </div>
        <div className="flex items-end gap-1 sm:gap-1.5 h-10 pt-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-cyan-300"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer tags */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          Garantia 25 anos de performance
        </span>
        <span className="text-emerald-400 font-semibold">Conta: R$ 740 → R$ 65</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. MOCK PROPOSTA COMERCIAL
// -------------------------------------------------------------
function CommercialMockProposal({
  clientName = "Mercado Central",
  compact,
  className = "",
}: {
  clientName?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-[#051624] p-3 sm:p-4 text-slate-100 font-sans shadow-2xl flex flex-col justify-between ${className}`}
    >
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-cyan-500/70" />
          </div>
          <div className="flex items-center gap-1.5 pl-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
            <Building2 className="h-3 w-3 text-cyan-400" />
            <span>EnergivIA · Comercial & Tarifa B3</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 uppercase tracking-wider">
          <Sparkles className="h-2.5 w-2.5" /> Análise B3
        </span>
      </div>

      {/* Client & System Title */}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400">
            Cliente: {clientName}
          </p>
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            Usina Fotovoltaica 34.2 kWp Comercial
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400">TIR Anual</span>
          <p className="text-xs sm:text-sm font-bold text-cyan-400">38,4% a.a.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-amber-400" /> Economia Mensal
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            R$ 4.350<span className="text-[9px] font-normal text-slate-400">/mês</span>
          </p>
          <span className="text-[8px] text-cyan-400 font-medium">R$ 52.200/ano</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> Investimento
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">R$ 118.000</p>
          <span className="text-[8px] text-emerald-400 font-medium">Payback: 2,3 anos</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Sun className="h-2.5 w-2.5 text-amber-400" /> Geração Anual
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            52.800 <span className="text-[9px] font-normal text-slate-400">kWh</span>
          </p>
          <span className="text-[8px] text-slate-400 font-medium">62 módulos 550W</span>
        </div>
      </div>

      {/* Cash Flow / ROI comparison bar */}
      <div
        className={`mt-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 sm:p-2.5 ${compact ? "hidden sm:block" : ""}`}
      >
        <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
          <span>Economia Acumulada em 25 Anos</span>
          <span className="text-cyan-400 font-bold">R$ 1.640.000,00</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
            style={{ width: "88%" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-slate-400">
          <span>Ano 1: R$ 52.200</span>
          <span>Ano 5: R$ 280.000</span>
          <span>Ano 25: R$ 1,64 M</span>
        </div>
      </div>

      {/* Footer tags */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <ShieldCheck className="h-3 w-3 text-cyan-400" />
          Inversor Trifásico 30kW + Módulos Tier 1
        </span>
        <span className="text-cyan-400 font-semibold">OPEX Reduzido em 86%</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. MOCK PROPOSTA USINAS & INDUSTRIAL
// -------------------------------------------------------------
function UsinasMockProposal({
  clientName = "Fábrica Horizonte",
  compact,
  className = "",
}: {
  clientName?: string;
  compact?: boolean;
  className?: string;
}) {
  const bars = [60, 65, 80, 88, 92, 100, 96, 90, 85, 78, 70, 62];

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-[#100f1a] p-3 sm:p-4 text-slate-100 font-sans shadow-2xl flex flex-col justify-between ${className}`}
    >
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-purple-500/70" />
          </div>
          <div className="flex items-center gap-1.5 pl-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
            <Factory className="h-3 w-3 text-purple-400" />
            <span>EnergivIA · Usina & Autoconsumo</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-semibold text-purple-400 uppercase tracking-wider">
          <TrendingUp className="h-2.5 w-2.5" /> Estudo de ROI
        </span>
      </div>

      {/* Client & System Title */}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-purple-400">
            Cliente: {clientName}
          </p>
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            Usina Solo 185 kWp · 3 Unidades Rateio
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400">ROI 25 Anos</span>
          <p className="text-xs sm:text-sm font-bold text-emerald-400">+418%</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-amber-400" /> Economia Mensal
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            R$ 22.800<span className="text-[9px] font-normal text-slate-400">/mês</span>
          </p>
          <span className="text-[8px] text-purple-400 font-medium">R$ 273.600/ano</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> Investimento
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">R$ 540.000</p>
          <span className="text-[8px] text-emerald-400 font-medium">Payback: 2,1 anos</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-left">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Sun className="h-2.5 w-2.5 text-purple-400" /> Geração Anual
          </span>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-white">
            295 <span className="text-[9px] font-normal text-slate-400">MWh</span>
          </p>
          <span className="text-[8px] text-slate-400 font-medium">336 painéis bifaciais</span>
        </div>
      </div>

      {/* Chart Section */}
      <div
        className={`mt-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 sm:p-2.5 ${compact ? "hidden sm:block" : ""}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-2.5 w-2.5 text-purple-400" /> Geração Compartilhada (MWh/mês)
          </span>
          <span className="text-[9px] text-purple-400 font-medium">24,5 MWh méd.</span>
        </div>
        <div className="flex items-end gap-1 sm:gap-1.5 h-10 pt-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-indigo-400 transition-all duration-300 group-hover:from-purple-500 group-hover:to-emerald-300"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer tags */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <ShieldCheck className="h-3 w-3 text-purple-400" />
          Subestação Abrigada + Estrutura Fixa de Solo
        </span>
        <span className="text-emerald-400 font-semibold">Economia 25a: R$ 6,8 Milhões</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. MOCK PROPOSTA WHATSAPP
// -------------------------------------------------------------
function WhatsAppMockProposal({
  clientName = "Dr. Marcos Silveira",
  _compact,
  className = "",
}: {
  clientName?: string;
  _compact?: boolean;
  className?: string;
}) {
  const firstName = clientName.split(" ")[0] || clientName;
  const initials = clientName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-[#061814] p-3 sm:p-4 text-slate-100 font-sans shadow-2xl flex flex-col justify-between ${className}`}
    >
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex items-center gap-1.5 pl-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
            <Smartphone className="h-3 w-3 text-emerald-400" />
            <span>EnergivIA · Automação WhatsApp</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
          <Zap className="h-2.5 w-2.5" /> 45s de Envio
        </span>
      </div>

      {/* Simulated WhatsApp Chat Bubble */}
      <div className="mt-2 space-y-2">
        {/* Incoming client prompt */}
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-200">
            {initials}
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-slate-800/90 px-3 py-2 text-[11px] text-slate-200 shadow-sm">
            <p className="font-semibold text-slate-400 text-[9px]">{clientName}</p>
            <p className="mt-0.5">
              Segue minha conta de luz! Conseguem ver quanto fica a economia?
            </p>
            <span className="mt-1 block text-right text-[8px] text-slate-500">14:31</span>
          </div>
        </div>

        {/* Outgoing bot response with rich proposal card */}
        <div className="flex items-start justify-end gap-2">
          <div className="w-full max-w-[95%] rounded-2xl rounded-tr-none bg-[#005c4b]/80 border border-emerald-500/30 p-2.5 text-white shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-400/20 pb-1.5 text-[10px]">
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Proposta Solar Pronta!
              </span>
              <span className="text-[9px] text-emerald-200">14:31 · IA EnergivIA</span>
            </div>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-100">
              Olá, {firstName}! Analisamos sua fatura:
            </p>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-lg bg-black/25 p-2 text-[10px]">
              <div>
                <span className="text-emerald-200 text-[9px]">Economia / mês:</span>
                <p className="font-bold text-white text-xs">R$ 940,00</p>
              </div>
              <div>
                <span className="text-emerald-200 text-[9px]">Potência:</span>
                <p className="font-bold text-white text-xs">8.2 kWp</p>
              </div>
              <div>
                <span className="text-emerald-200 text-[9px]">Payback estimado:</span>
                <p className="font-bold text-white text-xs">2,6 anos</p>
              </div>
              <div>
                <span className="text-emerald-200 text-[9px]">Conta cai para:</span>
                <p className="font-bold text-emerald-300 text-xs">R$ 75,00</p>
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="mt-2 flex gap-1.5">
              <div className="flex-1 rounded-md bg-emerald-500 py-1.5 text-center text-[10px] font-bold text-slate-950 shadow transition hover:bg-emerald-400">
                📄 Ver Proposta Interativa
              </div>
              <div className="rounded-md bg-emerald-800/80 px-2 py-1.5 text-center text-[10px] font-semibold text-white border border-emerald-400/30">
                ✓ Aceitar
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification status */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400">
          <Eye className="h-3 w-3" />
          Cliente visualizou a proposta há 2 minutos
        </span>
        <span className="text-slate-400">Taxa de conversão: 42%</span>
      </div>
    </div>
  );
}
