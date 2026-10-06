import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FileText, Cpu, CheckCheck, Zap, Sparkles } from "lucide-react";

export const PhoneChatMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entradas em cascata
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Mensagem 1 (Cliente enviando fatura) - frame 15
  const msg1Opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scanner de OCR ativo entre frame 45 e 110
  const isScanning = frame >= 45 && frame < 115;
  const scanProgress = interpolate(frame, [45, 110], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mensagem 2 (IA respondendo com dimensionamento) - frame 115
  const msg2Opacity = interpolate(frame, [115, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `scale(${entrance}) translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
      }}
      className="w-[580px] rounded-3xl border border-slate-700/60 bg-[#0C111D] p-5 shadow-2xl backdrop-blur-xl"
    >
      {/* Top Header do WhatsApp Mockup */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white shadow-md">
            <Zap className="h-5 w-5 text-emerald-200" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0C111D]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-100">
                EnergivIA Assistant
              </span>
              <span className="rounded bg-emerald-950/80 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">
                AI BOT
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/90 font-mono">
              Dimensionamento em tempo real
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          WhatsApp Integrado
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="space-y-4">
        {/* Mensagem 1: Cliente envia PDF */}
        <div style={{ opacity: msg1Opacity }} className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#1E293B] p-3.5 text-slate-100 shadow-md border border-slate-700/50">
            <div className="flex items-center space-x-3 rounded-xl bg-[#0F172A] p-2.5 mb-2 border border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/40">
                <FileText className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-slate-200 truncate">
                  Conta_Luz_Cemig_Agosto.pdf
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  1.4 MB • Fatura de Energia
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Olá! Gostaria de uma simulação solar para o meu comércio.
            </p>
            <div className="mt-1 flex items-center justify-end space-x-1 text-[10px] text-slate-400">
              <span>10:42</span>
              <CheckCheck className="h-3 w-3 text-sky-400" />
            </div>
          </div>
        </div>

        {/* Scanner de IA ativo */}
        {isScanning && (
          <div className="flex items-center space-x-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
            <Cpu className="h-5 w-5 animate-spin text-emerald-400" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span>Extraindo dados da distribuidora...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-emerald-950 overflow-hidden">
                <div
                  style={{ width: `${scanProgress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mensagem 2: IA responde com dados processados */}
        <div style={{ opacity: msg2Opacity }} className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-[#131C2E] p-4 text-slate-100 shadow-xl border border-emerald-800/40">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Fatura analisada com sucesso</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
              <div className="rounded-lg bg-[#0A0E17] p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  Consumo Médio
                </span>
                <span className="font-bold text-white text-sm">
                  920 kWh/mês
                </span>
              </div>
              <div className="rounded-lg bg-[#0A0E17] p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  Potência Ideal
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  7,41 kWp
                </span>
              </div>
              <div className="rounded-lg bg-[#0A0E17] p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  Módulos 570W
                </span>
                <span className="font-bold text-slate-200">13 Unidades</span>
              </div>
              <div className="rounded-lg bg-[#0A0E17] p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  Inversor
                </span>
                <span className="font-bold text-slate-200">Growatt 6kW</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              Seu pré-dimensionamento já está gerado e o cliente cadastrado
              automaticamente no seu CRM!
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
              <span className="text-emerald-400 font-mono">
                Lead criado no pipeline
              </span>
              <span>10:42</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
