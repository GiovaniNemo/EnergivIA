import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { RealPlatformShell } from "../components/RealPlatformShell";
import { RealTemplatesView } from "../components/RealTemplatesView";

export const Scene3ProposalStudio: React.FC = () => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 540], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-[#070A12] overflow-hidden select-none">
      {/* Áudio da Locutora para Cena 3 */}
      <Audio src={staticFile("audio/scene-3.mp3")} />

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width: "100%",
          height: "100%",
        }}
      >
        <RealPlatformShell
          activeNav="templates"
          headerTitle="Modelos de Proposta"
          headerBadge="Templates Editáveis & Opcionais"
        >
          <RealTemplatesView />
        </RealPlatformShell>
      </div>
    </AbsoluteFill>
  );
};
