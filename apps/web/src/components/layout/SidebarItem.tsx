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
        "group flex w-full items-center border-l-[3px] transition-all duration-200",
        collapsed ? "justify-center rounded-r-lg px-0 py-3.5" : "gap-3 rounded-r-lg py-3 pl-4 pr-3",
        disabled
          ? "border-l-transparent text-[var(--color-muted-foreground)] opacity-50 cursor-not-allowed hover:bg-transparent bg-black/5 dark:bg-black/20"
          : active
            ? "border-l-emerald-600 bg-emerald-500/10 text-emerald-800 dark:border-l-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300 shadow-[inset_0_0_12px_rgba(16,185,129,0.08)]"
            : "border-l-transparent text-[var(--color-muted-foreground)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-foreground)]"
      )}
    >
      <Icon
        className={cn(
          "h-[1.15rem] w-[1.15rem] shrink-0 transition-transform duration-200 group-hover:scale-105",
          active ? "text-emerald-600 dark:text-emerald-400" : "opacity-80"
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
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/10 text-[var(--color-muted-foreground)]"
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
