import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { RealPlatformShell } from "../components/RealPlatformShell";
import { RealDashboardView } from "../components/RealDashboardView";

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // Zoom suave e sutil para dar dinamismo cinematográfico sem distorcer o painel real
  const scale = interpolate(frame, [0, 360], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-[#070A12] overflow-hidden select-none">
      {/* Áudio da Locutora para Cena 1 */}
      <Audio src={staticFile("audio/scene-1.mp3")} />

      {/* Plataforma Real da EnergivIA com Painel Aberto */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width: "100%",
          height: "100%",
        }}
      >
        <RealPlatformShell
          activeNav="dashboard"
          headerTitle="Painel de Controle"
          headerBadge="Visão da Empresa"
        >
          <RealDashboardView />
        </RealPlatformShell>
      </div>
    </AbsoluteFill>
  );
};
