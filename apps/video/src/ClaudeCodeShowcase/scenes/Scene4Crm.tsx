import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { RealPlatformShell } from "../components/RealPlatformShell";
import { RealPipelineView } from "../components/RealPipelineView";

export const Scene4Crm: React.FC = () => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 450], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-[#070A12] overflow-hidden select-none">
      {/* Áudio da Locutora para Cena 4 */}
      <Audio src={staticFile("audio/scene-4.mp3")} />

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width: "100%",
          height: "100%",
        }}
      >
        <RealPlatformShell
          activeNav="pipeline"
          headerTitle="Pipeline de Vendas (CRM)"
          headerBadge="Funil & Rastreamento em Tempo Real"
        >
          <RealPipelineView />
        </RealPlatformShell>
      </div>
    </AbsoluteFill>
  );
};
