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
    text: "#022c22",
    background: "#ffffff",
    primary: "#059669",
    secondary: "#34d399",
  };
}

export function brandingToStepsTheme(branding?: {
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
}): StepsTheme {
  if (!branding) return defaultStepsTheme();
  const rawBg = branding.backgroundColor?.trim();
  const isDark =
    rawBg === "#060b16" ||
    rawBg === "#0b1220" ||
    rawBg === "#0b1b2b" ||
    rawBg === "#021b16" ||
    rawBg === "#020617";
  const bg = !rawBg || isDark ? "#ffffff" : rawBg;
  const text = !branding.textColor?.trim() || isDark ? "#022c22" : branding.textColor.trim();
  const primary = branding.primaryColor?.trim() || "#059669";
  const secondary = branding.secondaryColor?.trim() || "#34d399";
  return {
    text,
    background: bg,
    primary,
    secondary,
  };
}
