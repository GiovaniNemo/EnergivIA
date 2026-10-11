"use client";

import * as React from "react";
import { cn } from "@energivia/utils";

const STORAGE_PINNED_KEY = "energivia-sidebar-pinned";

export interface SidebarContextValue {
  /** Indica se a sidebar está expandida visualmente (seja por hover ou por estar fixada) */
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Se a sidebar está fixada aberta no layout (16rem física) */
  isPinned: boolean;
  setIsPinned: (v: boolean) => void;
  togglePinned: () => void;
  /** Se o cursor está sobre a sidebar no modo flutuante */
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  /** Controle do drawer em telas mobile */
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarProviderContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinnedState] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const leaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_PINNED_KEY);
    if (stored === "true") {
      setIsPinnedState(true);
    } else {
      setIsPinnedState(false);
    }
  }, []);

  const setIsPinned = React.useCallback((value: boolean) => {
    setIsPinnedState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_PINNED_KEY, String(value));
    }
  }, []);

  const togglePinned = React.useCallback(() => {
    setIsPinnedState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_PINNED_KEY, String(next));
      }
      return next;
    });
  }, []);

  const onHoverStart = React.useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const onHoverEnd = React.useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      leaveTimerRef.current = null;
    }, 250);
  }, []);

  React.useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  // open é true se estiver com hover OU se estiver fixado aberto OU se o mobile estiver aberto
  const open = isPinned || isHovered || mobileOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      setMobileOpen(value);
      setIsPinned(value);
    },
    [setIsPinned]
  );

  return (
    <SidebarProviderContext.Provider
      value={{
        open,
        setOpen,
        isPinned,
        setIsPinned,
        togglePinned,
        isHovered,
        onHoverStart,
        onHoverEnd,
        mobileOpen,
        setMobileOpen,
      }}
    >
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
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  );
}
