import type { StepsTheme } from "./types";

export function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return normalized;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function defaultStepsTheme(): StepsTheme {
  return {
    text: "#e5e7eb",
    background: "#0b1220",
    primary: "#22c55e",
    secondary: "#16a34a",
  };
}

export function brandingToStepsTheme(branding?: {
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
}): StepsTheme {
  if (!branding) return defaultStepsTheme();
  return {
    text: branding.textColor,
    background: branding.backgroundColor,
    primary: branding.primaryColor,
    secondary: branding.secondaryColor,
  };
}
