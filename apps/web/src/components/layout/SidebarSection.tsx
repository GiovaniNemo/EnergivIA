"use client";

import type { MenuItem } from "@/config/menu.config";
import { SidebarItem } from "./SidebarItem";

interface SidebarSectionProps {
  label: string;
  items: MenuItem[];
  collapsed: boolean;
  isActive: (path: string) => boolean;
  onItemClick?: () => void;
}

export function SidebarSection({
  label,
  items,
  collapsed,
  isActive,
  onItemClick,
}: SidebarSectionProps): JSX.Element {
  if (!items.length) return <></>;

  return (
    <section className="space-y-1">
      {!collapsed ? (
        <p className="px-5 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-emerald-600/90 dark:text-emerald-400/90 transition-opacity duration-200 animate-in fade-in-50">
          {label}
        </p>
      ) : (
        <div className="my-2 mx-auto w-6 border-t border-emerald-500/20 dark:border-emerald-500/30" />
      )}
      {items.map((item) => (
        <SidebarItem
          key={`${item.section}-${item.path}`}
          label={item.label}
          icon={item.icon}
          path={item.path}
          tooltip={item.tooltip}
          collapsed={collapsed}
          active={isActive(item.path)}
          highlight={item.highlight}
          badge={item.badge}
          disabled={item.disabled}
          onClick={onItemClick}
        />
      ))}
    </section>
  );
}
