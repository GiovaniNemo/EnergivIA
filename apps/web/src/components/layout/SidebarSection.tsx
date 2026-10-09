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
    <section className="space-y-0.5">
      {!collapsed ? (
        <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] transition-opacity duration-200 animate-in fade-in-50">
          {label}
        </p>
      ) : (
        <div className="my-2.5 mx-auto w-6 border-t border-white/[0.08]" />
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
