"use client";

import React from "react";

export type BartPose = "thumbs_up" | "frente" | "acenando" | "perfil";

interface BartSpriteProps {
  pose?: BartPose;
  className?: string;
  size?: number; // altura aproximada em px
}

export function BartSprite({ pose = "thumbs_up", className = "", size = 320 }: BartSpriteProps) {
  // Coordenadas calculadas sobre a imagem 1024x768 de bart-sheet.jpg
  // Base: altura 400px, largura ~190px
  const scale = size / 400;

  let offsetX = -190;
  let offsetY = -130;
  let width = 185;

  if (pose === "frente") {
    offsetX = -12;
    offsetY = -130;
    width = 175;
  } else if (pose === "acenando") {
    offsetX = -780;
    offsetY = -130;
    width = 195;
  } else if (pose === "perfil") {
    offsetX = -365;
    offsetY = -130;
    width = 150;
  }

  return (
    <div
      className={`relative overflow-hidden select-none pointer-events-none drop-shadow-[0_20px_35px_rgba(14,38,80,0.18)] ${className}`}
      style={{
        width: `${width * scale}px`,
        height: `${400 * scale}px`,
      }}
    >
      {/* Imagem do Model Sheet Oficial posicionada com precisão de pixel */}
      <img
        src="/bart/bart-sheet.jpg"
        alt="BART Mascote Oficial EnergivIA"
        className="absolute max-w-none"
        style={{
          width: `${1024 * scale}px`,
          height: `${768 * scale}px`,
          transform: `translate(${offsetX * scale}px, ${offsetY * scale}px)`,
        }}
      />
    </div>
  );
}
