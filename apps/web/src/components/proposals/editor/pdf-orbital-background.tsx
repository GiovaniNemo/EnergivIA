import type { CSSProperties, JSX } from "react";

export interface PdfOrbitalBackgroundProps {
  primaryColor?: string;
  variant?: "cover" | "content";
  className?: string;
  style?: CSSProperties;
}

/**
 * Renderizador vetorial de arcos concêntricos e linhas orbitais elegantes para o PDF.
 * Inspirado em design editorial contemporâneo de alto contraste.
 * Reage 100% à cor primária pré-definida da organização.
 */
export function PdfOrbitalBackground({
  primaryColor = "#10b981",
  variant = "cover",
  className = "pointer-events-none absolute inset-0 h-full w-full overflow-hidden",
  style,
}: PdfOrbitalBackgroundProps): JSX.Element {
  const isContent = variant === "content";
  // Em páginas de conteúdo, a opacidade é atenuada para não interferir na leitura de tabelas e textos
  const baseOpacity = isContent ? 0.35 : 1.0;
  const strokeColor = primaryColor || "#10b981";

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
          <linearGradient id={`grad-sweep-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="50%" stopColor={strokeColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id={`grad-soft-${variant}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* --- Centro Orbital 1: Superior Direito (varredura descendente suave) --- */}
        <circle
          cx="560"
          cy="190"
          r="160"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeOpacity="0.15"
        />
        <circle
          cx="560"
          cy="190"
          r="290"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeOpacity="0.12"
        />
        <circle
          cx="560"
          cy="190"
          r="450"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeOpacity="0.10"
        />
        <circle
          cx="560"
          cy="190"
          r="640"
          stroke={`url(#grad-sweep-${variant})`}
          strokeWidth="1.5"
        />
        <circle
          cx="560"
          cy="190"
          r="860"
          stroke={strokeColor}
          strokeWidth="1.0"
          strokeOpacity="0.06"
        />

        {/* --- Centro Orbital 2: Inferior Esquerdo (arcos concêntricos de base) --- */}
        <circle
          cx="110"
          cy="920"
          r="140"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeOpacity="0.16"
        />
        <circle
          cx="110"
          cy="920"
          r="270"
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeOpacity="0.12"
        />
        <circle cx="110" cy="920" r="430" stroke={`url(#grad-soft-${variant})`} strokeWidth="1.4" />
        <circle
          cx="110"
          cy="920"
          r="620"
          stroke={strokeColor}
          strokeWidth="1.0"
          strokeOpacity="0.06"
        />

        {/* --- Traços dinâmicos de ligação / Curvas Bezier sutis --- */}
        <path
          d="M -50 480 C 250 400, 540 680, 844 590"
          stroke={strokeColor}
          strokeWidth="1.0"
          strokeOpacity="0.07"
          strokeDasharray="4 6"
        />
        <path
          d="M -100 220 C 320 180, 480 460, 894 400"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeOpacity="0.09"
        />
      </svg>
    </div>
  );
}
