import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Users, Eye, CheckCircle } from "lucide-react";

export const CrmKanbanMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Alerta de notificação de abertura de proposta em tempo real (aparece no frame 35)
  const alertOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const alertY = interpolate(frame, [35, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `scale(${entrance}) translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
      }}
      className="w-[880px] rounded-3xl border border-slate-700/60 bg-[#0A0E17]/95 p-6 shadow-2xl backdrop-blur-2xl relative"
    >
      {/* Notificação Flutuante: Cliente Abriu a Proposta em Tempo Real */}
      <div
        style={{
          opacity: alertOpacity,
          transform: `translateY(${alertY}px)`,
        }}
        className="absolute -top-6 right-8 flex items-center space-x-3 rounded-2xl border border-amber-500/50 bg-[#161D2E] px-4 py-3 shadow-2xl z-30"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-amber-300">
              Rastreamento em Tempo Real
            </span>
            <span className="rounded bg-amber-950/80 px-1.5 py-0.2 text-[9px] font-mono text-amber-400 border border-amber-800/40">
              AGORA
            </span>
          </div>
          <p className="text-[11px] text-slate-300">
            Cliente <strong className="text-white">Ricardo Mendes</strong> abriu
            a Proposta Comercial #3082!
          </p>
        </div>
      </div>

      {/* Top Header do CRM */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-slate-100">
                CRM Solar EnergivIA
              </span>
              <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">
                FUNIL ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Gestão de Vendas & Oportunidades do Integrador
            </p>
          </div>
        </div>

        {/* Métricas Resumidas */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Conversão</span>
            <span className="font-bold text-emerald-400 text-sm">38,4%</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">
              Tempo Médio
            </span>
            <span className="font-bold text-sky-400 text-sm">&lt; 2 min</span>
          </div>
        </div>
      </div>

      {/* Colunas do Funil Kanban */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        {/* Coluna 1: Novos Leads */}
        <div className="rounded-xl border border-slate-800 bg-[#0E1524] p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-300">Novos Leads</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
              3
            </span>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800/80">
            <p className="font-medium text-slate-200">
              Padaria Pão D&apos;Ouro
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              850 kWh • Cemig
            </p>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800/80">
            <p className="font-medium text-slate-200">Residencial Dr. Carlos</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              620 kWh • CPFL
            </p>
          </div>
        </div>

        {/* Coluna 2: Proposta Enviada */}
        <div className="rounded-xl border border-slate-800 bg-[#0E1524] p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-sky-400">
              Propostas Enviadas
            </span>
            <span className="rounded-full bg-sky-950 px-2 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-800/50">
              5
            </span>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-sky-500/40 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-200">
                Supermercado Nova Era
              </p>
              <Eye className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
              R$ 54.200 • Visualizou há 2m
            </p>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800/80">
            <p className="font-medium text-slate-200">Fazenda Boa Vista</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              R$ 98.000 • Enviado
            </p>
          </div>
        </div>

        {/* Coluna 3: Em Negociação */}
        <div className="rounded-xl border border-slate-800 bg-[#0E1524] p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-amber-400">Em Negociação</span>
            <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-800/50">
              4
            </span>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-amber-500/30">
            <p className="font-medium text-slate-200">Clínica Odonto Mais</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Ajustando opcionais
            </p>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800/80">
            <p className="font-medium text-slate-200">Metalúrgica Paulista</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Financiamento aprovado
            </p>
          </div>
        </div>

        {/* Coluna 4: Contratos Fechados */}
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2">
            <span className="font-semibold text-emerald-400">Fechados</span>
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-700/50">
              8
            </span>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-emerald-500/50">
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">Auto Posto Rota 7</p>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
              R$ 142.000 • Aceite Digital
            </p>
          </div>
          <div className="rounded-lg bg-[#080C14] p-2.5 border border-emerald-500/40">
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">Academia Iron Fitness</p>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
              R$ 38.900 • Aceite Digital
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
