"use client";

import type { ReactNode } from "react";

export interface CTAHeaderProps {
  subtitle?: ReactNode;
  mutedColor: string;
  align: "left" | "center" | "right";
}

export function CTAHeader({ subtitle, mutedColor, align }: CTAHeaderProps): JSX.Element | null {
  if (!subtitle) return null;
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div
      className={`mb-6 max-w-none text-sm leading-relaxed ${alignClass}`}
      style={{ color: mutedColor }}
    >
      {subtitle}
    </div>
  );
}
