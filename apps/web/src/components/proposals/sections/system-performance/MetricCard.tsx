"use client";

import type { SystemPerformanceTheme } from "./types";

export interface MetricCardProps {
  title: string;
  value: string;
  footer: string;
  theme: SystemPerformanceTheme;
}

export function MetricCard({ title, value, footer, theme }: MetricCardProps): JSX.Element {
  return (
    <div
      className="flex flex-col rounded-2xl px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
      style={{
        backgroundColor: `color-mix(in srgb, ${theme.text} 5%, ${theme.background})`,
        border: `1px solid color-mix(in srgb, ${theme.text} 8%, transparent)`,
      }}
    >
      <p
        className="text-xs font-medium"
        style={{ color: `color-mix(in srgb, ${theme.text} 50%, transparent)` }}
      >
        {title}
      </p>
      <p
        className="mt-2 text-lg font-semibold leading-tight sm:text-xl"
        style={{ color: theme.text }}
      >
        {value}
      </p>
      <p
        className="mt-2 text-[11px] leading-snug sm:text-xs"
        style={{ color: `color-mix(in srgb, ${theme.text} 45%, transparent)` }}
      >
        {footer}
      </p>
    </div>
  );
}
