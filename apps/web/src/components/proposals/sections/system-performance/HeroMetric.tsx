"use client";

import type { SystemPerformanceTheme } from "./types";

export interface HeroMetricProps {
  potencia: number;
  theme: SystemPerformanceTheme;
  label?: string;
}

export function HeroMetric({
  potencia,
  theme,
  label = "Capacidade do Sistema",
}: HeroMetricProps): JSX.Element {
  const formatted = Number.isFinite(potencia) ? potencia.toFixed(2) : "—";

  return (
    <div
      className="mx-auto w-full max-w-xl rounded-[20px] px-8 py-8 text-center shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
      style={{
        backgroundColor: `color-mix(in srgb, ${theme.text} 4%, ${theme.background})`,
        border: `1px solid color-mix(in srgb, ${theme.text} 10%, transparent)`,
      }}
    >
      <p
        className="text-4xl font-bold tracking-tight sm:text-5xl"
        style={{
          backgroundImage: `linear-gradient(105deg, ${theme.primary}, ${theme.secondary})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {formatted} kWp
      </p>
      <p
        className="mt-2 text-sm font-medium sm:text-base"
        style={{ color: `color-mix(in srgb, ${theme.text} 55%, transparent)` }}
      >
        {label}
      </p>
    </div>
  );
}
