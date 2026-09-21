"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Users,
  FileText,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Sun,
  ShieldCheck,
} from "lucide-react";

const PIPELINE_STAGES = [
  {
    key: "novo",
    label: "Novo",
    count: 14,
    color: "bg-slate-500",
    deals: [
      {
        id: "1",
        name: "Carlos Eduardo",
        type: "Residencial",
        power: "4,4 kWp",
        value: "R$ 14.200",
        time: "há 12 min",
        stageColor: "text-slate-300",
      },
      {
        id: "2",
        name: "Clínica Vida & Saúde",
        type: "Comercial",
        power: "12,8 kWp",
        value: "R$ 41.500",
        time: "há 45 min",
        stageColor: "text-slate-300",
      },
    ],
  },
  {
    key: "proposta",
    label: "Proposta Enviada",
    count: 8,
    color: "bg-amber-400",
    deals: [
      {
        id: "3",
        name: "Marcelo S. Santana",
        type: "Residencial",
        power: "5,5 kWp",
        value: "R$ 17.800",
        time: "Visualizada",
        stageColor: "text-amber-300",
      },
      {
        id: "4",
        name: "Auto Peças Maringá",
        type: "Comercial",
        power: "18,2 kWp",
        value: "R$ 58.900",
        time: "Enviada hoje",
        stageColor: "text-amber-300",
      },
    ],
  },
  {
    key: "negociacao",
    label: "Em Negociação",
    count: 6,
    color: "bg-blue-400",
    deals: [
      {
        id: "5",
        name: "Supermercado Aliança",
        type: "Comercial",
        power: "35,0 kWp",
        value: "R$ 112.000",
        time: "Simulando Santander",
        stageColor: "text-blue-300",
      },
    ],
  },
  {
    key: "fechado",
    label: "Fechado (Ganho)",
    count: 18,
    color: "bg-emerald-400",
    deals: [
      {
        id: "6",
        name: "Fazenda Bela Vista",
        type: "Rural / Agro",
        power: "28,6 kWp",
        value: "R$ 89.400",
        time: "Contrato Assinado",
        stageColor: "text-emerald-300",
      },
      {
        id: "7",
        name: "Residência Família Lima",
        type: "Residencial",
        power: "6,6 kWp",
        value: "R$ 21.900",
        time: "Pago à vista",
        stageColor: "text-emerald-300",
      },
    ],
  },
];

export function ConvergingHeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<"todos" | "residencial" | "comercial">("todos");

  // Scroll-driven 3D tilt & smooth spring physics
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  const rotateX = useTransform(smoothProgress, [0, 1], [7, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(smoothProgress, [0, 0.35, 1], [0.8, 0.98, 1]);
  const y = useTransform(smoothProgress, [0, 1], [35, 0]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-8 w-full max-w-[1180px] px-2 sm:px-4"
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
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-t border-r border-amber-300/35 border-b border-l border-slate-700/60 bg-[#0c1424]/95 p-1 sm:p-2 shadow-[0_25px_60px_rgba(0,0,0,0.7),-10px_-10px_40px_rgba(251,191,36,0.06)] backdrop-blur-xl"
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
              Painel em Tempo Real
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              <Sun className="h-3 w-3 text-amber-400" />
              Empresa Solar Conectada
            </span>
          </div>
        </div>

        {/* Inner Platform Header */}
        <div className="border-b border-slate-800/80 bg-[#0c1424] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Painel de Oportunidades & Vendas
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                  Visão do Integrador
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhe propostas geradas, funil de fechamento e faturamento fotovoltaico do mês.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
                <button
                  onClick={() => setActiveFilter("todos")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeFilter === "todos" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveFilter("residencial")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeFilter === "residencial" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Residencial
                </button>
                <button
                  onClick={() => setActiveFilter("comercial")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeFilter === "comercial" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Comercial
                </button>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                <span>Nova Proposta</span>
              </div>
            </div>
          </div>

          {/* KPI Cards Row (Matching Real Dashboard) */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {/* KPI 1: Leads */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Leads no Mês
                </span>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-white">48</p>
              <p className="mt-0.5 text-[10.5px] text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>+12 novos esta semana</span>
              </p>
            </div>

            {/* KPI 2: Propostas Enviadas */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Propostas Enviadas
                </span>
                <FileText className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-white">32</p>
              <p className="mt-0.5 text-[10.5px] text-amber-300">4 propostas hoje no WhatsApp</p>
            </div>

            {/* KPI 3: Taxa de Conversão */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Conversão Comercial
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-emerald-400">42%</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">18 negócios fechados</p>
            </div>

            {/* KPI 4: Receita em Negociação */}
            <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-slate-900/80 to-slate-900/70 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-amber-300">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Volume em Negociação
                </span>
                <Wallet className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-amber-200">R$ 284.500</p>
              <p className="mt-0.5 text-[10.5px] text-amber-300/80">Propostas ativas no funil</p>
            </div>
          </div>
        </div>

        {/* Pipeline / Funil de Vendas Columns */}
        <div className="p-3 sm:p-5 bg-[#0a101d]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>Pipeline Solar (Funil de Negócios)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                (Arrastável e integrado ao WhatsApp)
              </span>
            </h3>
            <span className="text-xs text-emerald-400 font-semibold hidden sm:inline-block">
              Total Faturado no Mês: R$ 342.000,00
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.key}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3 space-y-2.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                    <span className="text-xs font-bold text-slate-200">{stage.label}</span>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    {stage.count}
                  </span>
                </div>

                {/* Deal Cards in this column */}
                <div className="space-y-2">
                  {stage.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="group rounded-lg border border-slate-800/90 bg-[#0d1627] p-2.5 hover:border-slate-700 transition-all hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-bold text-white group-hover:text-amber-200 transition-colors">
                          {deal.name}
                        </p>
                        <span className="text-[10px] text-slate-400">{deal.time}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {deal.type} • {deal.power}
                        </span>
                        <span className={`font-extrabold ${deal.stageColor}`}>{deal.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Live Activity Feed Strip */}
          <div className="mt-3 rounded-xl border border-slate-800/80 bg-[#0d1627]/90 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-slate-300">
                  Última Atividade no WhatsApp:
                </span>
                <span className="text-xs text-white">
                  <b>Fazenda Bela Vista</b> aceitou a proposta comercial de <b>R$ 89.400,00</b>
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Notificação enviada ao integrador há 4 minutos</span>
              </span>
            </div>
          </div>
        </div>

        {/* Browser Status Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-[#09101d] px-4 py-2.5 sm:px-6 text-xs text-slate-400 rounded-b-xl sm:rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Sincronizado com CRM & WhatsApp
            </span>
            <span className="hidden sm:inline-block text-slate-700">•</span>
            <span className="hidden sm:inline-block text-slate-400">
              Taxa média de fechamento do integrador: <b className="text-amber-300">+42%</b>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Painel comercial oficial da plataforma EnergivIA
          </div>
        </div>
      </motion.div>
    </div>
  );
}
