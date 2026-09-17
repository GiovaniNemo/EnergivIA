import React from "react";
import {
  AbsoluteFill,
  Series,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  interpolate,
} from "remotion";
import { VideoBackground } from "./Background";
import { HeaderBar } from "./HeaderBar";
import { ProgressBar } from "./ProgressBar";
import { Scene1Hero } from "./Scene1Hero";
import { Scene2OCR } from "./Scene2OCR";
import { Scene3Engineering } from "./Scene3Engineering";
import { Scene4WhatsAppCRM } from "./Scene4WhatsAppCRM";
import { Scene5ProposalFinance } from "./Scene5ProposalFinance";
import { Scene6CTA } from "./Scene6CTA";

export const SCENE_NAMES = [
  "Apresentação",
  "OCR & Leitura de Conta",
  "Dimensionamento Fotovoltaico",
  "Automação no WhatsApp",
  "Propostas & Financiamento",
  "Resultados & Comece Já",
];

export const InstitutionalVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Volume fade-in at start (30 frames) and fade-out at end (45 frames)
  const volume = interpolate(
    frame,
    [0, 30, durationInFrames - 45, durationInFrames],
    [0, 0.45, 0.45, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // 150 frames per scene at 30fps = 5 seconds each (Total 900 frames = 30 seconds)
  const activeSceneIndex = Math.min(
    SCENE_NAMES.length - 1,
    Math.floor(frame / 150),
  );

  return (
    <AbsoluteFill
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Universal Tech Background */}
      <VideoBackground />

      {/* Global Header */}
      <HeaderBar
        currentScene={SCENE_NAMES[activeSceneIndex]}
        stepNumber={activeSceneIndex + 1}
        totalSteps={SCENE_NAMES.length}
      />

      {/* Sequential Storytelling Scenes */}
      <Series>
        <Series.Sequence durationInFrames={150}>
          <Scene1Hero />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <Scene2OCR />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <Scene3Engineering />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <Scene4WhatsAppCRM />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <Scene5ProposalFinance />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <Scene6CTA />
        </Series.Sequence>
      </Series>

      {/* Timeline Tracker */}
      <ProgressBar scenes={SCENE_NAMES} activeSceneIndex={activeSceneIndex} />

      {/* Soundtrack with smooth fade in / out */}
      <Audio src={staticFile("background-music.mp3")} volume={volume} />
    </AbsoluteFill>
  );
};
