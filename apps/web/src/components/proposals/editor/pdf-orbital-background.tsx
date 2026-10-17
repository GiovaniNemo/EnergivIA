import React, { useId, type CSSProperties, type JSX } from "react";

export interface PdfOrbitalBackgroundProps {
  primaryColor?: string;
  variant?: "cover" | "content";
  className?: string;
  style?: CSSProperties;
}

/**
 * Renderizador vetorial de arcos concêntricos e linhas orbitais elegantes para o PDF e preview.
 * Inspirado em design editorial contemporâneo de alto nível executivo.
 * Reage 100% à cor primária pré-definida da organização com alta nitidez e visibilidade.
 */
export function PdfOrbitalBackground({
  primaryColor = "#10b981",
  variant = "cover",
  className = "pointer-events-none absolute inset-0 h-full w-full overflow-hidden",
  style,
}: PdfOrbitalBackgroundProps): JSX.Element {
  const isContent = variant === "content";
  // Opacidade equilibrada para garantir que as linhas e arcos sejam claramente visíveis
  const baseOpacity = isContent ? 0.85 : 1.0;
  const strokeColor = primaryColor || "#10b981";

  // Identificador único para evitar colisões de gradiente no DOM entre múltiplas páginas
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sweepId = `grad-sweep-${variant}-${safeId}`;
  const softId = `grad-soft-${variant}-${safeId}`;

  const sweepStopStart = isContent ? "0.40" : "0.55";
  const sweepStopMid = isContent ? "0.22" : "0.32";
  const sweepStopEnd = isContent ? "0.08" : "0.14";

  const softStopStart = isContent ? "0.38" : "0.50";
  const softStopEnd = isContent ? "0.08" : "0.12";

  const circle1Opacity = isContent ? "0.26" : "0.36";
  const circle2Opacity = isContent ? "0.22" : "0.30";
  const circle3Opacity = isContent ? "0.18" : "0.24";
  const circleOuterOpacity = isContent ? "0.14" : "0.18";

  return (
    <div
      className={className}
      data-variant={variant}
      style={{
        zIndex: 0,
        opacity: baseOpacity,
        ...style,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 794 1123"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={sweepId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={sweepStopStart} />
            <stop offset="50%" stopColor={strokeColor} stopOpacity={sweepStopMid} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={sweepStopEnd} />
          </linearGradient>

          <linearGradient id={softId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={softStopStart} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={softStopEnd} />
          </linearGradient>
        </defs>

        {/* --- Centro Orbital 1: Superior Direito (varredura descendente suave) --- */}
        <circle
          cx="560"
          cy="190"
          r="160"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeOpacity={circle1Opacity}
        />
        <circle
          cx="560"
          cy="190"
          r="290"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeOpacity={circle2Opacity}
        />
        <circle
          cx="560"
          cy="190"
          r="450"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeOpacity={circle3Opacity}
        />
        <circle cx="560" cy="190" r="640" stroke={`url(#${sweepId})`} strokeWidth="1.8" />
        <circle
          cx="560"
          cy="190"
          r="860"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeOpacity={circleOuterOpacity}
        />

        {/* --- Centro Orbital 2: Inferior Esquerdo (arcos concêntricos de base) --- */}
        <circle
          cx="110"
          cy="920"
          r="140"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeOpacity={circle1Opacity}
        />
        <circle
          cx="110"
          cy="920"
          r="270"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeOpacity={circle2Opacity}
        />
        <circle cx="110" cy="920" r="430" stroke={`url(#${softId})`} strokeWidth="1.8" />
        <circle
          cx="110"
          cy="920"
          r="620"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeOpacity={circleOuterOpacity}
        />

        {/* --- Traços dinâmicos de ligação / Curvas Bezier marcantes --- */}
        <path
          d="M -50 480 C 250 400, 540 680, 844 590"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeOpacity={circle3Opacity}
          strokeDasharray="5 7"
        />
        <path
          d="M -100 220 C 320 180, 480 460, 894 400"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeOpacity={circle2Opacity}
        />
      </svg>
    </div>
  );
}
