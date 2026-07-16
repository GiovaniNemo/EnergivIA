"use client";

import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import {
  CheckCircle,
  ClipboardList,
  FileCheck,
  Hammer,
  PenLine,
  Plug,
  Search,
  Truck,
} from "lucide-react";

const STEP_ICONS: LucideIcon[] = [
  ClipboardList,
  Search,
  PenLine,
  Hammer,
  Truck,
  Plug,
  CheckCircle,
  FileCheck,
];

export interface StepIconProps {
  index: number;
  iconName?: string;
  size?: number;
  color: string;
  className?: string;
}

function toPascalCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join("");
}

function resolveLucideIcon(iconName: string | undefined): LucideIcon | null {
  const normalized = String(iconName ?? "")
    .trim()
    .toLowerCase();
  if (!normalized || !(normalized in dynamicIconImports)) return null;
  const exportName = toPascalCase(normalized);
  const candidate = (LucideIcons as Record<string, unknown>)[exportName];
  const isRenderable =
    typeof candidate === "function" || (typeof candidate === "object" && candidate);
  return isRenderable ? (candidate as LucideIcon) : null;
}

export function StepIcon({
  index,
  iconName,
  size = 22,
  color,
  className,
}: StepIconProps): JSX.Element {
  const Icon =
    resolveLucideIcon(iconName) ?? STEP_ICONS[index % STEP_ICONS.length] ?? ClipboardList;
  return (
    <Icon
      className={className}
      width={size}
      height={size}
      strokeWidth={1.75}
      style={{ color }}
      aria-hidden
    />
  );
}
