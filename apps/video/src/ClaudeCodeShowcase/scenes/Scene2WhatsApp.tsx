import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { RealPlatformShell } from "../components/RealPlatformShell";
import { RealWhatsAppView } from "../components/RealWhatsAppView";

export const Scene2WhatsApp: React.FC = () => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 450], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-[#070A12] overflow-hidden select-none">
      {/* Áudio da Locutora para Cena 2 */}
      <Audio src={staticFile("audio/scene-2.mp3")} />

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
          headerTitle="Atendimento & Leitura de Fatura"
          headerBadge="WhatsApp com IA Conectado"
        >
          <RealWhatsAppView />
        </RealPlatformShell>
      </div>
    </AbsoluteFill>
  );
};
