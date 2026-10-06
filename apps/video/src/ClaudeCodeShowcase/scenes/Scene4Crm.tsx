import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { CrmKanbanMockup } from "../components/CrmKanbanMockup";
import { Users, Eye, TrendingUp, CheckCircle } from "lucide-react";

export const Scene4Crm: React.FC = () => {
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

      {/* Áudio da Locutora para Cena 4 */}
      <Audio src={staticFile("audio/scene-4.mp3")} />

      {/* Header da Seção */}
      <div className="absolute top-10 flex items-center space-x-3 rounded-full border border-sky-500/30 bg-sky-950/20 px-5 py-2 text-xs font-mono text-sky-300 z-10">
        <Users className="h-4 w-4 text-sky-400" />
        <span>DIFERENCIAL 3 • CRM SOLAR COM RASTREAMENTO EM TEMPO REAL</span>
      </div>

      {/* Mockup Central do CRM */}
      <div className="z-10 mt-6">
        <CrmKanbanMockup />
      </div>

      {/* Destaques de Gestão no Rodapé */}
      <div className="absolute bottom-8 flex items-center space-x-6 z-10">
        <div
          style={{
            opacity: interpolate(frame, [30, 50], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <Eye className="h-4 w-4 text-amber-400" />
          <span>Saiba no Segundo Exato em que o Cliente Abre a Proposta</span>
        </div>

        <div
          style={{
            opacity: interpolate(frame, [60, 80], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span>Taxa de Conversão 3x Maior</span>
        </div>

        <div
          style={{
            opacity: interpolate(frame, [90, 110], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
          className="flex items-center space-x-2 text-xs font-mono text-slate-300 rounded-lg bg-[#0F1626] px-3.5 py-1.5 border border-slate-800"
        >
          <CheckCircle className="h-4 w-4 text-sky-400" />
          <span>Controle Total do Funil e da Equipe</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
