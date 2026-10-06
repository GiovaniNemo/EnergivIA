import React from "react";
import {
  AbsoluteFill,
  Series,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2WhatsApp } from "./scenes/Scene2WhatsApp";
import { Scene3ProposalStudio } from "./scenes/Scene3ProposalStudio";
import { Scene4Crm } from "./scenes/Scene4Crm";
import { Scene5ClosingCTA } from "./scenes/Scene5ClosingCTA";

export const SCENE_DURATIONS = {
  SCENE_1: 360, // 12s
  SCENE_2: 450, // 15s
  SCENE_3: 540, // 18s
  SCENE_4: 450, // 15s
  SCENE_5: 450, // 15s
};

export const TOTAL_FRAMES =
  SCENE_DURATIONS.SCENE_1 +
  SCENE_DURATIONS.SCENE_2 +
  SCENE_DURATIONS.SCENE_3 +
  SCENE_DURATIONS.SCENE_4 +
  SCENE_DURATIONS.SCENE_5; // 2250 frames (75s)

export const EnergiviaSalesShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  // Volume suave da trilha instrumental de fundo (fade in no início e fade out no final)
  const musicVolume = interpolate(
    frame,
    [0, 45, TOTAL_FRAMES - 60, TOTAL_FRAMES],
    [0, 0.08, 0.08, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Barra de progresso discreta no topo
  const progressPercent = (frame / TOTAL_FRAMES) * 100;

  return (
    <AbsoluteFill className="bg-[#070A12]">
      {/* Barra de Progresso do Vídeo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 z-50 overflow-hidden">
        <div
          style={{ width: `${progressPercent}%` }}
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400"
        />
      </div>

      {/* Orquestração em Sequência das 5 Cenas */}
      <Series>
        {/* Cena 1: O Problema das Ferramentas Fragmentadas */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.SCENE_1}>
          <Scene1Problem />
        </Series.Sequence>

        {/* Cena 2: O Diferencial: IA no WhatsApp */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.SCENE_2}>
          <Scene2WhatsApp />
        </Series.Sequence>

        {/* Cena 3: Estúdio de Propostas com Templates & Opcionais */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.SCENE_3}>
          <Scene3ProposalStudio />
        </Series.Sequence>

        {/* Cena 4: CRM Solar Dedicado ao Integrador */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.SCENE_4}>
          <Scene4Crm />
        </Series.Sequence>

        {/* Cena 5: Fechamento Comercial & CTA */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.SCENE_5}>
          <Scene5ClosingCTA />
        </Series.Sequence>
      </Series>

      {/* Trilha Sonora Instrumental de Fundo em Volume Suave */}
      <Audio src={staticFile("background-music.mp3")} volume={musicVolume} />
    </AbsoluteFill>
  );
};
