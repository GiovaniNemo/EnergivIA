"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@energivia/utils";

interface SidebarItemProps {
  label: string;
  icon: LucideIcon;
  path: string;
  tooltip?: string;
  active: boolean;
  collapsed: boolean;
  highlight?: boolean;
  badge?: string | number;
  disabled?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  label,
  icon: Icon,
  path,
  tooltip,
  active,
  collapsed,
  badge,
  disabled,
  onClick,
}: SidebarItemProps): JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={disabled ? "#" : path}
      onClick={handleClick}
      title={collapsed ? (tooltip ?? label) : tooltip}
      className={cn(
        "group flex items-center transition-all duration-200",
        collapsed
          ? "mx-auto h-10 w-10 justify-center rounded-xl p-0"
          : "mx-2.5 h-10 w-[calc(100%-1.25rem)] gap-3 rounded-xl px-3 py-2",
        disabled
          ? "text-slate-500/50 dark:text-slate-500/50 opacity-50 cursor-not-allowed hover:bg-transparent bg-black/5 dark:bg-black/20"
          : active
            ? "bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400/50 dark:border-emerald-400/40 shadow-[0_0_20px_-2px_rgba(16,185,129,0.35)] backdrop-blur-md"
            : "text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 hover:border-white/40 dark:hover:border-white/15 hover:shadow-[0_4px_16px_rgba(255,255,255,0.08)] backdrop-blur-xs border border-transparent"
      )}
    >
      <Icon
        className={cn(
          "h-[1.15rem] w-[1.15rem] shrink-0 transition-all duration-200 group-hover:scale-105",
          active
            ? "text-emerald-600 dark:text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            : "text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors"
        )}
      />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate text-[14px] font-medium tracking-tight animate-in fade-in-50 duration-200">
            {label}
          </span>
          {badge != null && (typeof badge === "string" || badge > 0) ? (
            <span
              className={cn(
                "ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tracking-wider",
                badge === "EXPIRADO"
                  ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                  : disabled
                    ? "bg-emerald-500/15 text-emerald-400 opacity-90"
                    : active
                      ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40"
                      : "bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-200"
              )}
            >
              {badge}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}
