import { Eye, CheckCircle } from "lucide-react";

export const RealPipelineView: React.FC = () => {
  return (
    <div className="space-y-4 h-full overflow-hidden flex flex-col justify-between relative">
      {/* Alerta de Rastreamento em Tempo Real Flutuante */}
      <div className="absolute top-0 right-4 flex items-center space-x-3 rounded-2xl border-2 border-amber-500/60 bg-[#161D2E] px-4 py-2.5 shadow-2xl z-40 animate-pulse">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-amber-300">
              Rastreamento Ativo
            </span>
            <span className="rounded bg-amber-950 px-1 py-0.2 text-[9px] font-mono text-amber-400">
              AGORA
            </span>
          </div>
          <p className="text-[11px] text-slate-200">
            <strong>Ricardo Mendes</strong> abriu a Proposta #3082!
          </p>
        </div>
      </div>

      {/* Sub-header do Pipeline com Métricas Reais */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-4 text-xs font-mono">
          <span className="text-slate-400">
            Total em Negociação:{" "}
            <strong className="text-emerald-400">R$ 486.200,00</strong>
          </span>
          <span>•</span>
          <span className="text-slate-400">
            Taxa de Conversão:{" "}
            <strong className="text-purple-400">38,4%</strong>
          </span>
          <span>•</span>
          <span className="text-slate-400">
            Tempo Médio de Fechamento:{" "}
            <strong className="text-sky-400">&lt; 3 dias</strong>
          </span>
        </div>
      </div>

      {/* As 5 Colunas Reais do Pipeline Kanban da EnergivIA */}
      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0 text-xs">
        {/* Coluna 1: Novo */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1220] p-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-300">Novo</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                4
              </span>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">
                Padaria Pão D&apos;Ouro
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                850 kWh • Cemig
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 34.000
              </p>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">Residencial Jardins</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                620 kWh • CPFL
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 26.500
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 2: Contato */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1220] p-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sky-400">Contato</span>
              <span className="rounded-full bg-sky-950 px-2 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-800/40">
                3
              </span>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">Clínica Sorriso Mais</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                1.100 kWh • WhatsApp
              </p>
              <p className="text-[10px] text-sky-400 font-bold mt-1">
                R$ 42.000
              </p>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">Mercado Bom Preço</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                1.450 kWh • Contato Feito
              </p>
              <p className="text-[10px] text-sky-400 font-bold mt-1">
                R$ 58.000
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 3: Proposta */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1220] p-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-purple-400">Proposta</span>
              <span className="rounded-full bg-purple-950 px-2 py-0.5 text-[10px] font-mono text-purple-400 border border-purple-800/40">
                5
              </span>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border-2 border-amber-500/60 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">Supermercado Nova Era</p>
                <Eye className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                Visualizou há 2 min!
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 54.200
              </p>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">Fazenda Boa Vista</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Link Web Enviado
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 98.000
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 4: Negociação */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1220] p-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-emerald-500">Negociação</span>
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">
                3
              </span>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-emerald-800/40">
              <p className="font-bold text-slate-200">Metalúrgica Paulista</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Ajuste de Opcionais
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 68.000
              </p>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-slate-800">
              <p className="font-bold text-slate-200">Hotel Alvorada</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Financiamento Aprovado
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 85.000
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 5: Fechado */}
        <div className="rounded-xl border border-emerald-600/30 bg-emerald-950/20 p-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
              <span className="font-bold text-emerald-400">Fechado</span>
              <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-700/50">
                8
              </span>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-emerald-500/50">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">Auto Posto Rota 7</p>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-emerald-300 font-mono mt-0.5">
                Aceite Digital no Link
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 142.000
              </p>
            </div>
            <div className="rounded-lg bg-[#080C14] p-2.5 border border-emerald-500/50">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">Academia Iron</p>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-emerald-300 font-mono mt-0.5">
                Aceite Digital no Link
              </p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                R$ 38.900
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
