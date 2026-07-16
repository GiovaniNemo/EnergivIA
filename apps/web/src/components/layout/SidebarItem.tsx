"use client";

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
  badge?: number;
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
  onClick,
}: SidebarItemProps): JSX.Element {
  return (
    <Link
      href={path}
      onClick={onClick}
      title={collapsed ? (tooltip ?? label) : tooltip}
      className={cn(
        "group flex w-full items-center border-l-[3px] transition-all duration-150",
        collapsed ? "justify-center rounded-r-lg px-0 py-4" : "gap-3 rounded-r-lg py-3.5 pl-4 pr-3",
        active
          ? "border-l-emerald-600 bg-emerald-100 text-emerald-800 dark:border-l-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-l-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
      )}
    >
      <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate text-[15px] font-medium">{label}</span>
          {badge != null && badge > 0 ? (
            <span
              className={cn(
                "ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
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
