import {
  Plus,
  Sparkles,
  Check,
  ShieldCheck,
  Activity,
  BatteryCharging,
  Eye,
  FileCheck,
} from "lucide-react";

export const RealTemplatesView: React.FC = () => {
  return (
    <div className="space-y-6 h-full overflow-hidden flex flex-col justify-between">
      {/* Header dos Templates com Botões Oficiais */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Modelos de Proposta Comerciais</span>
            <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/50">
              ESTÚDIO ATIVO
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Personalize capas, seções dinâmicas e opcionais com a identidade da
            sua integradora.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Carregar Modelo Oficial</span>
          </button>
          <button className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
            <Plus className="h-3.5 w-3.5" />
            <span>Novo Modelo</span>
          </button>
        </div>
      </div>

      {/* Grid: 3 Modelos Oficiais da EnergivIA + Painel de Opcionais */}
      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Coluna Esquerda: Lista de Modelos Oficiais Reais */}
        <div className="col-span-7 grid grid-cols-2 gap-4">
          {/* Card 1: Modelo Padrão Oficial */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-[#0C1220] p-4 flex flex-col justify-between shadow-xl relative">
            <div className="absolute top-3 right-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
              PADRÃO
            </div>
            <div>
              <div className="h-28 w-full rounded-xl bg-gradient-to-br from-slate-900 to-[#101D33] p-3 border border-slate-800 mb-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Capa Split Editorial</span>
                  <span className="text-emerald-400">● 100% Editável</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-24 bg-emerald-500/60 rounded" />
                  <div className="h-1.5 w-36 bg-slate-700 rounded" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                  <span>Economia Anual</span>
                  <span className="text-emerald-300 font-bold">R$ 11.280</span>
                </div>
              </div>

              <h4 className="font-bold text-sm text-white">
                Modelo Oficial EnergivIA
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Layout de alto padrão com estudo de irradiação, gráficos de
                payback e aceite digital.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/35 bg-emerald-500/12 text-emerald-300">
                <Check className="h-3 w-3 mr-1" /> Publicado
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Usado em 14 propostas
              </span>
            </div>
          </div>

          {/* Card 2: Executivo Comercial */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 flex flex-col justify-between shadow-lg">
            <div>
              <div className="h-28 w-full rounded-xl bg-gradient-to-br from-slate-900 to-[#1A1829] p-3 border border-slate-800 mb-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] font-mono text-purple-300">
                  <span>Capa Card Overlay</span>
                  <span>B2B Comercial</span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-28 bg-purple-500/60 rounded" />
                  <div className="h-1.5 w-32 bg-slate-700 rounded" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                  <span>Usinas Comerciais</span>
                  <span className="text-purple-300 font-bold">&gt; 30 kWp</span>
                </div>
              </div>

              <h4 className="font-bold text-sm text-white">
                Executivo Comercial B2B
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Foco em retorno de investimento rápido, depreciação acelerada e
                fluxo de caixa.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/35 bg-emerald-500/12 text-emerald-300">
                <Check className="h-3 w-3 mr-1" /> Publicado
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Usado em 5 propostas
              </span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Opcionais Modulares Reais da Plataforma */}
        <div className="col-span-5 rounded-2xl border border-slate-800 bg-[#0C1220] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Opcionais Configuráveis na Proposta
              </span>
              <span className="text-xs font-bold text-emerald-400">
                + R$ 1.270 margem média
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#080C14] p-3 border border-emerald-500/30">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Seguro All-Risk de Engenharia
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Proteção contra intempéries por 1 ano
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  + R$ 850
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#080C14] p-3 border border-sky-500/30">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950/60 text-sky-400">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Monitoramento Ativo 24/7
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Notificação de desvios de geração
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400">
                  + R$ 420
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#080C14] p-3 border border-amber-500/30">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950/60 text-amber-400">
                    <BatteryCharging className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Inversor Híbrido com Bateria
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Sistema anti-apagão para cargas críticas
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400">
                  Opcional
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 mt-4 flex items-center justify-between text-xs text-purple-300">
            <div className="flex items-center space-x-2">
              <FileCheck className="h-4 w-4 text-purple-400" />
              <span>Gera Proposta Web Interativa e PDF com 1 clique</span>
            </div>
            <Eye className="h-4 w-4 text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
