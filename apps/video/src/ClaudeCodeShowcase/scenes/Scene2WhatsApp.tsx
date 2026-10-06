import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { PhoneChatMockup } from "../components/PhoneChatMockup";
import { Sun, CheckCircle, Zap, ArrowRight } from "lucide-react";

export const Scene2WhatsApp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardEntrance = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#070A12] text-white p-12 overflow-hidden select-none">
      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Áudio da Locutora para Cena 2 */}
      <Audio src={staticFile("audio/scene-2.mp3")} />

      {/* Header da Seção */}
      <div className="absolute top-10 flex items-center space-x-3 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-5 py-2 text-xs font-mono text-emerald-300 z-10">
        <Zap className="h-4 w-4 text-emerald-400" />
        <span>
          DIFERENCIAL 1 • IA NO WHATSAPP COM LEITURA DE FATURA EM SEGUNDOS
        </span>
      </div>

      {/* Conteúdo Principal Split (Chat + Dados Técnicos Instantâneos) */}
      <div className="flex items-center justify-center space-x-10 w-full max-w-6xl mt-6 z-10">
        {/* Mockup do WhatsApp */}
        <PhoneChatMockup />

        {/* Card Lateral: Análise Técnica & Cotação do Distribuidor */}
        <div
          style={{
            transform: `scale(${cardEntrance}) translateX(${interpolate(cardEntrance, [0, 1], [40, 0])}px)`,
            opacity: cardEntrance,
          }}
          className="w-[460px] space-y-4 rounded-3xl border border-slate-800 bg-[#0C1220]/95 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/40">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Engenharia Solar Autônoma
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Cálculo de Irradiação & Cotação de Kits
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between rounded-xl bg-[#070A12] p-3 border border-slate-800/80">
              <span className="text-slate-400">Irradiação Solar Local:</span>
              <span className="font-bold text-amber-400">4,88 kWh/m²/dia</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#070A12] p-3 border border-slate-800/80">
              <span className="text-slate-400">Geração Mensal Estimada:</span>
              <span className="font-bold text-emerald-400">1.080 kWh/mês</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#070A12] p-3 border border-slate-800/80">
              <span className="text-slate-400">Distribuidor Parceiro:</span>
              <span className="font-bold text-sky-400">
                Kit Solis / Canadian
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#070A12] p-3 border border-slate-800/80">
              <span className="text-slate-400">Economia em 1 Ano:</span>
              <span className="font-bold text-emerald-300">R$ 11.280,00</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">Oportunidade criada no CRM</span>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
