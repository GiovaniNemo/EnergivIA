"use client";

import * as React from "react";
import { cn } from "@energivia/utils";

const STORAGE_KEY = "energivia-sidebar-open";

const SidebarProviderContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = React.useState(true);

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "false") setOpenState(false);
    if (stored === "true") setOpenState(true);
  }, []);

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return (
    <SidebarProviderContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarProviderContext.Provider>
  );
}

export function useSidebar() {
  const ctx = React.useContext(SidebarProviderContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />;
}
