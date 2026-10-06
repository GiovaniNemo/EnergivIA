import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { ProposalEditorMockup } from "../components/ProposalEditorMockup";
import { Layers, Palette, ShieldCheck, CheckCheck } from "lucide-react";

export const Scene3ProposalStudio: React.FC = () => {
  const frame = useCurrentFrame();

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

      {/* Áudio da Locutora para Cena 3 */}
      <Audio src={staticFile("audio/scene-3.mp3")} />

      {/* Header da Seção */}
      <div className="absolute top-10 flex items-center space-x-3 rounded-full border border-purple-500/30 bg-purple-950/20 px-5 py-2 text-xs font-mono text-purple-300 z-10">
        <Layers className="h-4 w-4 text-purple-400" />
        <span>
          DIFERENCIAL 2 • ESTÚDIO DE PROPOSTAS COM TEMPLATES EDITÁVEIS &
          OPCIONAIS
        </span>
      </div>

      {/* Mockup Central do Editor */}
      <div className="z-10 mt-6">
        <ProposalEditorMockup />
      </div>

      {/* Destaques de Venda no Rodapé */}
      <div className="absolute bottom-8 flex items-center space-x-6 z-10">
        <div
          style={{
            opacity: interpolate(frame, [40, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <Palette className="h-4 w-4 text-purple-400" />
          <span>Capas & Identidade da Sua Marca</span>
        </div>

        <div
          style={{
            opacity: interpolate(frame, [80, 100], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Opcionais Flexíveis com Margem Alta</span>
        </div>

        <div
          style={{
            opacity: interpolate(frame, [120, 140], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <CheckCheck className="h-4 w-4 text-sky-400" />
          <span>Aceite Digital Instantâneo</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
