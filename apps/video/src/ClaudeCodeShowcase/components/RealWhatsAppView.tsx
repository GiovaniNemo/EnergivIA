import React from "react";
import { Img, staticFile } from "remotion";
import { FileText, CheckCheck, Sparkles, ExternalLink } from "lucide-react";

export const RealWhatsAppView: React.FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      {/* Container Central do WhatsApp da EnergivIA */}
      <div className="w-[820px] rounded-3xl border border-slate-700/80 bg-[#0B141A] p-5 shadow-2xl flex flex-col justify-between">
        {/* Header do WhatsApp Oficial */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/40 p-1.5 shadow-md">
              <Img
                src={staticFile("favicon-light.png")}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">
                  EnergivIA Solar Bot
                </span>
                <span className="rounded bg-emerald-950 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">
                  OFICIAL
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono">
                Atendimento & Engenharia com IA
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Integrado ao CRM EnergivIA
          </div>
        </div>

        {/* Conversa do Fluxo Real */}
        <div className="space-y-3.5 text-xs">
          {/* Mensagem 1: Cliente enviando a fatura PDF */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#005C4B] p-3 text-white shadow-md">
              <div className="flex items-center space-x-3 rounded-xl bg-[#02473A] p-2.5 mb-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/30 text-rose-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs truncate">
                    Conta_Luz_Cemig.pdf
                  </p>
                  <p className="text-[10px] text-emerald-200 font-mono">
                    1.4 MB • Fatura Cemig
                  </p>
                </div>
              </div>
              <p className="text-xs text-emerald-50">
                Olá! Gostaria de uma simulação solar para o meu comércio.
              </p>
              <div className="mt-1 flex items-center justify-end space-x-1 text-[10px] text-emerald-200">
                <span>10:42</span>
                <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
              </div>
            </div>
          </div>

          {/* Mensagem 2: IA responde com leitura e kits reais */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#202C33] p-4 text-slate-100 shadow-xl border border-slate-700/50">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 mb-2">
                <Sparkles className="h-4 w-4" />
                <span>
                  Fatura lida com sucesso pela Inteligência Artificial
                </span>
              </div>

              {/* Grid Técnico Extraído */}
              <div className="grid grid-cols-4 gap-2 text-xs font-mono mb-3">
                <div className="rounded-lg bg-[#111B21] p-2 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">
                    Consumo
                  </span>
                  <span className="font-bold text-white">920 kWh/mês</span>
                </div>
                <div className="rounded-lg bg-[#111B21] p-2 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">
                    Distribuidora
                  </span>
                  <span className="font-bold text-white">Cemig (B3)</span>
                </div>
                <div className="rounded-lg bg-[#111B21] p-2 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">
                    Potência
                  </span>
                  <span className="font-bold text-emerald-400">7,41 kWp</span>
                </div>
                <div className="rounded-lg bg-[#111B21] p-2 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">
                    Módulos
                  </span>
                  <span className="font-bold text-white">13x 570W</span>
                </div>
              </div>

              {/* Tiers Reais de Kits da EnergivIA */}
              <div className="space-y-1.5 text-[11px] font-mono mb-3 border-t border-slate-700 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Cotações Atualizadas de Distribuidores:
                </p>
                <div className="flex justify-between items-center rounded bg-[#111B21] px-2.5 py-1 text-slate-300">
                  <span>Standard (Growatt 6kW):</span>
                  <strong className="text-white">R$ 26.500</strong>
                </div>
                <div className="flex justify-between items-center rounded bg-[#111B21] px-2.5 py-1 text-emerald-400 border border-emerald-500/30">
                  <span>Elite (Solis / Canadian) - Recomendado:</span>
                  <strong className="text-emerald-300">R$ 28.900</strong>
                </div>
                <div className="flex justify-between items-center rounded bg-[#111B21] px-2.5 py-1 text-slate-300">
                  <span>Premium (Fronius):</span>
                  <strong className="text-white">R$ 34.200</strong>
                </div>
              </div>

              {/* Link Oficial da Proposta Gerada */}
              <div className="rounded-xl bg-[#111B21] p-2.5 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Proposta Interativa Pronta
                  </p>
                  <p className="text-xs font-bold text-emerald-400 truncate">
                    energivia.com.br/proposta/pv-8921
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white flex items-center space-x-1">
                  <span>Abrir Proposta</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/50 pt-1.5">
                <span className="text-emerald-400 font-mono">
                  Lead criado automaticamente no CRM
                </span>
                <span>10:42</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
