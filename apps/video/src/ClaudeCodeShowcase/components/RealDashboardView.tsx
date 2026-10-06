import React from "react";
import {
  Users,
  FileText,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

export const RealDashboardView: React.FC = () => {
  return (
    <div className="space-y-6 h-full overflow-hidden flex flex-col justify-between">
      {/* 4 Cards de KPI Reais do Dashboard da EnergivIA */}
      <div className="grid grid-cols-4 gap-4">
        {/* Card 1: Leads */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Leads da Empresa
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-white">28</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+12% no mês (34 no total)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Propostas Enviadas */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Propostas da Equipe
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/40">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-white">19</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-sky-400">
              <Clock className="h-3.5 w-3.5" />
              <span>4 enviadas hoje</span>
            </div>
          </div>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Taxa de Conversão
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              38,4%
            </span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-400">
              <span>11 fechadas / 28 leads</span>
            </div>
          </div>
        </div>

        {/* Card 4: Receita Prevista */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Receita Prevista
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-amber-300">
              R$ 486.200
            </span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-400">
              <span>8 negócios em negociação</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Funil do Pipeline Real & Atividades Recentes */}
      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Coluna 1: Funil com os 5 Estágios Reais */}
        <div className="col-span-7 rounded-2xl border border-slate-800 bg-[#0C1220] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Funil de Oportunidades Solares
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                Total: 23 projetos ativos
              </span>
            </div>

            <div className="space-y-3">
              {/* Estágio 1: Novo */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-slate-400 font-medium">Novo</span>
                <div className="flex-1 h-3 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    style={{ width: "30%" }}
                    className="h-full bg-[#94a3b8] rounded-full"
                  />
                </div>
                <span className="font-mono text-slate-300 font-bold w-12 text-right">
                  4 leads
                </span>
              </div>

              {/* Estágio 2: Contato */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-slate-400 font-medium">Contato</span>
                <div className="flex-1 h-3 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    style={{ width: "45%" }}
                    className="h-full bg-[#2563eb] rounded-full"
                  />
                </div>
                <span className="font-mono text-sky-400 font-bold w-12 text-right">
                  3 contatos
                </span>
              </div>

              {/* Estágio 3: Proposta */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-slate-400 font-medium">
                  Proposta
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    style={{ width: "70%" }}
                    className="h-full bg-[#7c3aed] rounded-full"
                  />
                </div>
                <span className="font-mono text-purple-400 font-bold w-12 text-right">
                  5 enviadas
                </span>
              </div>

              {/* Estágio 4: Negociação */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-slate-400 font-medium">
                  Negociação
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    style={{ width: "55%" }}
                    className="h-full bg-[#059669] rounded-full"
                  />
                </div>
                <span className="font-mono text-emerald-400 font-bold w-12 text-right">
                  3 em ajuste
                </span>
              </div>

              {/* Estágio 5: Fechado */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-emerald-400 font-bold">Fechado</span>
                <div className="flex-1 h-3 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    style={{ width: "100%" }}
                    className="h-full bg-[#10b981] rounded-full"
                  />
                </div>
                <span className="font-mono text-emerald-400 font-bold w-12 text-right">
                  8 ganhos
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 mt-4 text-xs text-emerald-300 flex items-center justify-between">
            <span>Conversão estimada de fechamento:</span>
            <strong className="font-mono text-emerald-400 text-sm">
              R$ 218.400 em fechamento iminente
            </strong>
          </div>
        </div>

        {/* Coluna 2: Atividades Recentes Reais */}
        <div className="col-span-5 rounded-2xl border border-slate-800 bg-[#0C1220] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Atividades em Tempo Real
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-start space-x-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">
                    Auto Posto Rota 7 fechou negócio
                  </p>
                  <p className="text-[11px] text-emerald-400 font-mono">
                    R$ 142.000 · Aceite Digital via Link
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#080C14] p-3 flex items-start space-x-3">
                <FileText className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    Proposta enviada · Supermercado Nova Era
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    R$ 54.200 · Kit Solis 12kWp
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#080C14] p-3 flex items-start space-x-3">
                <MessageSquare className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    Novo cliente via WhatsApp · Marcelo Santana
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Fatura Cemig · 920 kWh/mês
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-300 font-mono">
            Sincronização instantânea com CRM & WhatsApp
          </div>
        </div>
      </div>
    </div>
  );
};
