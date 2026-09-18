"use client";

import React from "react";
import { Zap, ShieldCheck, Clock, TrendingUp, Sparkles } from "lucide-react";

export function LiveTelemetryStats(): JSX.Element {
  const stats = [
    {
      label: "Propostas Geradas",
      value: "14.800+",
      sub: "Em todo o Brasil",
      icon: Zap,
      color: "emerald",
    },
    {
      label: "Economia Simulada",
      value: "R$ 62M+",
      sub: "Economizados para clientes",
      icon: TrendingUp,
      color: "amber",
    },
    {
      label: "Tempo Médio de Envio",
      value: "45 seg",
      sub: "Do upload ao WhatsApp",
      icon: Clock,
      color: "cyan",
    },
    {
      label: "Precisão OCR",
      value: "99.8%",
      sub: "Em faturas e contas",
      icon: ShieldCheck,
      color: "emerald",
    },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              TELEMETRIA OPERACIONAL AO VIVO
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Dados consolidados de integradores parceiros</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {stats.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <item.icon className="h-3.5 w-3.5 text-slate-500" />
                <span>{item.label}</span>
              </div>
              <div className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                {item.value}
              </div>
              <div className="text-[11px] text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
