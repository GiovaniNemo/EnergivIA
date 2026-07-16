"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SELECT_ICON_MAP: Record<string, LucideIcon> = {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Circle,
};

export function renderSelectOptionIcon(iconName: string | undefined): JSX.Element | null {
  if (!iconName) return null;
  if (iconName.startsWith("grid-")) {
    const token = iconName.replace("grid-", "");
    const positionByToken: Record<string, string> = {
      "top-left": "items-start justify-start",
      "top-center": "items-start justify-center",
      "top-right": "items-start justify-end",
      "middle-left": "items-center justify-start",
      "middle-center": "items-center justify-center",
      "middle-right": "items-center justify-end",
      "bottom-left": "items-end justify-start",
      "bottom-center": "items-end justify-center",
      "bottom-right": "items-end justify-end",
    };
    const dotPosition = positionByToken[token] ?? "items-center justify-center";
    return (
      <span
        className={`grid h-4 w-4 shrink-0 rounded-[4px] border border-current/40 p-[2px] opacity-90 ${dotPosition}`}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    );
  }
  const Icon = SELECT_ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden />;
}
