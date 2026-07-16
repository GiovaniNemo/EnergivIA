import type { DecisionCTATheme } from "./types";

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

const DEFAULT_DANGER = "#ef4444";

export function buildDecisionCTATheme(
  branding: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
  },
  dangerColorField?: unknown
): DecisionCTATheme {
  const dangerRaw = typeof dangerColorField === "string" ? dangerColorField.trim() : "";
  const danger = dangerRaw || DEFAULT_DANGER;
  return {
    primary: branding.primaryColor,
    secondary: branding.secondaryColor,
    danger,
    text: branding.textColor,
    background: branding.backgroundColor,
  };
}
