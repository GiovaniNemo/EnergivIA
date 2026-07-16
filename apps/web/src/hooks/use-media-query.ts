"use client";

import { useEffect, useState } from "react";

export function useShortcutMod(): string | null {
  const [mod, setMod] = useState<string | null>(null);

  useEffect(() => {
    const isTouchOnly = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouchOnly) {
      setMod(null);
      return;
    }
    const isMac = /mac/i.test(navigator.platform ?? "");
    setMod(isMac ? "⌘" : "Ctrl");
  }, []);

  return mod;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
