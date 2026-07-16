"use client";

import * as React from "react";
import { cn } from "@energivia/utils";

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { width?: string; collapsed?: boolean }
>(({ className, width, collapsed, style, ...props }, ref) => {
  const w = width ?? (collapsed ? "4.5rem" : "17rem");
  return (
    <aside
      ref={ref}
      style={{ width: w, transition: "width 0.2s ease", ...style }}
      className={cn(
        "flex h-full min-h-screen shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-sidebar)]",
        className
      )}
      {...props}
    />
  );
});
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { collapsed?: boolean }
>(({ className, collapsed, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex min-h-[7rem] w-full items-center justify-center border-b border-[var(--color-border)] px-3 py-4 transition-[padding] duration-200",
      !collapsed && "justify-start gap-2 px-5",
      className
    )}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { collapsed?: boolean }
>(({ className, collapsed, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex-1 overflow-auto py-3 transition-[padding] duration-200",
      collapsed ? "px-2" : "px-3",
      className
    )}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { collapsed?: boolean }
>(({ className, collapsed, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "border-t border-[var(--color-border)] p-3 transition-[padding] duration-200",
      collapsed && "px-2",
      className
    )}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export { Sidebar, SidebarHeader, SidebarContent, SidebarFooter };
