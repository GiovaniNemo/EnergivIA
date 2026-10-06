import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import {
  Palette,
  ShieldCheck,
  BatteryCharging,
  Activity,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

export const ProposalEditorMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Animação de ativação do opcional 1 (frame 40)
  const option1Active = frame >= 40;
  // Animação de ativação do opcional 2 (frame 80)
  const option2Active = frame >= 80;

  // Valor total recalculando dinamicamente
  const totalValue = option2Active
    ? "R$ 29.480,00"
    : option1Active
      ? "R$ 28.630,00"
      : "R$ 27.780,00";

  return (
    <div
      style={{
        transform: `scale(${entrance}) translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
      }}
      className="w-[840px] rounded-3xl border border-slate-700/60 bg-[#0A0E17]/95 p-6 shadow-2xl backdrop-blur-2xl"
    >
      {/* Top Header do Editor de Propostas */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/50">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-slate-100">
                Estúdio de Propostas & Templates
              </span>
              <span className="rounded bg-purple-950 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-800/40">
                100% CUSTOMIZÁVEL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Modelo Oficial EnergivIA • Capa Split Editorial
            </p>
          </div>
        </div>

        {/* Templates Rápidos */}
        <div className="flex items-center space-x-1.5 rounded-xl bg-[#111726] p-1 border border-slate-800 text-xs">
          <button className="px-3 py-1 rounded-lg bg-purple-600/30 text-purple-300 font-medium border border-purple-500/40">
            Editorial
          </button>
          <button className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200">
            Minimalista
          </button>
          <button className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200">
            Card Overlay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Coluna Esquerda: Opcionais Modulares */}
        <div className="col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Opcionais de Alto Valor Agregado
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Margem adicional para o integrador
            </span>
          </div>

          {/* Opcional 1: Seguro */}
          <div
            className={`flex items-center justify-between rounded-xl p-3 border ${
              option1Active
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-slate-800 bg-[#101726]"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Seguro Estrutura & Vendaval
                </p>
                <p className="text-[10px] text-slate-400">
                  Cobertura all-risk por 12 meses
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium text-emerald-400">
                + R$ 850
              </span>
              <div
                className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                  option1Active
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                {option1Active && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          </div>

          {/* Opcional 2: Monitoramento */}
          <div
            className={`flex items-center justify-between rounded-xl p-3 border ${
              option2Active
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-slate-800 bg-[#101726]"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/40">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Monitoramento Proativo 24/7
                </p>
                <p className="text-[10px] text-slate-400">
                  Alerta automático de falhas na geração
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium text-emerald-400">
                + R$ 850
              </span>
              <div
                className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                  option2Active
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                {option2Active && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          </div>

          {/* Opcional 3: Bateria */}
          <div className="flex items-center justify-between rounded-xl p-3 border border-slate-800 bg-[#101726]">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
                <BatteryCharging className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Upgrade: Inversor Híbrido com Bateria
                </p>
                <p className="text-[10px] text-slate-400">
                  Backup para quedas de energia na rede
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Opcional
            </span>
          </div>
        </div>

        {/* Coluna Direita: Preview Dinâmico do Resumo Financeiro */}
        <div className="col-span-5 rounded-2xl border border-slate-800 bg-[#0E1524] p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              Resumo da Proposta Comercial
            </span>

            <div className="rounded-xl bg-[#080C14] p-3 border border-slate-800 mb-3">
              <span className="text-[10px] text-slate-400 block font-mono">
                Valor Total do Projeto
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 block">
                {totalValue}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Equipamentos + Instalação + Opcionais
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Economia Estimada:</span>
                <span className="text-emerald-400 font-bold">
                  R$ 940,00/mês
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Retorno do Investimento:</span>
                <span className="text-amber-400 font-bold">2,6 anos</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Economia em 25 anos:</span>
                <span className="text-emerald-300 font-bold">
                  R$ 282.000,00
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-xs text-white text-center shadow-lg flex items-center justify-center space-x-2">
              <FileCheck className="h-4 w-4" />
              <span>Gerar Proposta Interativa Web & PDF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
