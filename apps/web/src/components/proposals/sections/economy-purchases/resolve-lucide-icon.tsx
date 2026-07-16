"use client";

import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { AlertCircle } from "lucide-react";

function toPascalCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join("");
}

export function resolveLucideIconFromName(iconName: string | undefined): LucideIcon {
  const normalized = String(iconName ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return AlertCircle;
  if (!(normalized in dynamicIconImports)) return AlertCircle;
  const exportName = toPascalCase(normalized);
  const candidate = (LucideIcons as Record<string, unknown>)[exportName];
  const isRenderable =
    typeof candidate === "function" || (typeof candidate === "object" && candidate);
  return isRenderable ? (candidate as LucideIcon) : AlertCircle;
}
