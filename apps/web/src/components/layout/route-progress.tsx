"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress(): JSX.Element {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const stopAutoIncrement = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setVisible(true);
    setProgress(12);

    stopAutoIncrement();
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const step = prev < 40 ? 8 : prev < 70 ? 4 : 2;
        return Math.min(88, prev + step);
      });
    }, 140);
  };

  const done = () => {
    if (!startedRef.current) return;
    stopAutoIncrement();
    setProgress(100);
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
      startedRef.current = false;
    }, 220);
  };

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      if (url.pathname.startsWith("/auth/logout")) return;

      start();
    };

    document.addEventListener("click", onDocumentClick, false);
    return () => {
      document.removeEventListener("click", onDocumentClick, false);
      stopAutoIncrement();
    };
  }, []);

  useEffect(() => {
    done();
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[200] h-0.5 w-full"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 180ms ease" }}
    >
      <div
        className="h-full bg-[var(--color-primary)]"
        style={{ width: `${progress}%`, transition: "width 180ms ease-out" }}
      />
    </div>
  );
}
