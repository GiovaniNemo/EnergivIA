"use client";

import React from "react";
import { Zap, Activity, BatteryCharging, SunMedium } from "lucide-react";

interface RadarStatsHeaderProps {
  stats: {
    totalInstallations: number;
    totalPowerMwp: number;
    averagePowerKwp: number;
    upgradePotentialCount: number;
    residentialPercent: number;
    commercialPercent: number;
    ruralPercent: number;
    estimatedMonthlyGenerationMwh: number;
    topNeighborhoods: Array<{ name: string; count: number; totalKwp: number }>;
  } | null;
  loading?: boolean;
}

export function RadarStatsHeader({ stats, loading }: RadarStatsHeaderProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-neutral-900/60 rounded-xl border border-neutral-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Total de Usinas */}
      <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950 p-3.5 rounded-2xl border border-neutral-800/80 shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Usinas no Radar
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <SunMedium className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{stats.totalInstallations}</span>
          <span className="text-xs text-neutral-400">conexões</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
          <span>{stats.residentialPercent}% residenciais</span>
          <span>•</span>
          <span>{stats.commercialPercent}% comerciais</span>
        </div>
      </div>

      {/* Potência Mapeada */}
      <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950 p-3.5 rounded-2xl border border-neutral-800/80 shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Potência Total
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-400">{stats.totalPowerMwp}</span>
          <span className="text-xs font-semibold text-neutral-400">MWp instalados</span>
        </div>
        <div className="mt-1 text-[11px] text-neutral-400">
          Média de <span className="text-white font-medium">{stats.averagePowerKwp} kWp</span> por
          sistema
        </div>
      </div>

      {/* Alvos de Upgrade & Baterias */}
      <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950 p-3.5 rounded-2xl border border-neutral-800/80 shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            Alvos de Retrofit
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <BatteryCharging className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-purple-400">{stats.upgradePotentialCount}</span>
          <span className="text-xs text-neutral-400">usinas &gt; 3 anos</span>
        </div>
        <div className="mt-1 text-[11px] text-purple-300/80 font-medium">
          Oportunidade p/ baterias & ampliação
        </div>
      </div>

      {/* Geração Mensal Estimada */}
      <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950 p-3.5 rounded-2xl border border-neutral-800/80 shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Geração Mensal
          </span>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            {stats.estimatedMonthlyGenerationMwh}
          </span>
          <span className="text-xs text-neutral-400">MWh/mês</span>
        </div>
        <div className="mt-1 text-[11px] text-neutral-400 truncate">
          Top Bairros:{" "}
          <span className="text-neutral-300">
            {stats.topNeighborhoods
              .slice(0, 2)
              .map((n) => n.name)
              .join(", ") || "Região"}
          </span>
        </div>
      </div>
    </div>
  );
}
