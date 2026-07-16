"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Menu, UserRound, Sparkles } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-inset";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { useIsMobile } from "@/hooks/use-media-query";
import { GlobalSearch, type GlobalSearchHandle } from "@/components/layout/global-search";
import Image from "next/image";
import Link from "next/link";

function userInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return (email ?? "U").slice(0, 2).toUpperCase();
}

function UserMenu(): JSX.Element {
  const { user: auth0User } = useUser();
  const { user: profile } = useOrganization();
  const [open, setOpen] = useState(false);
  const [pictureError, setPictureError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayName = profile?.name ?? auth0User?.name ?? auth0User?.email ?? null;
  const email = profile?.email ?? auth0User?.email ?? null;
  const picture = profile?.picture ?? auth0User?.picture ?? null;

  useEffect(() => {
    setPictureError(false);
  }, [picture]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Menu do usuário"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)] text-xs font-bold text-white transition-opacity hover:opacity-80"
        onClick={() => setOpen((v) => !v)}
      >
        {picture && !pictureError ? (
          <img
            src={picture}
            alt={displayName ?? "Avatar"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setPictureError(true)}
          />
        ) : (
          userInitials(displayName, email)
        )}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-[70] w-56 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          <div className="border-b border-[var(--color-border)] px-3.5 py-2.5">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {displayName ?? "Usuário"}
            </p>
            {email ? (
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">{email}</p>
            ) : null}
          </div>
          <Link
            href="/perfil"
            className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]/40"
            onClick={() => setOpen(false)}
          >
            <UserRound className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            Editar perfil
          </Link>
          <a
            href="/auth/logout"
            className="flex items-center gap-2 border-t border-[var(--color-border)] px-3.5 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Deslogar
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();
  const { user: profile } = useOrganization();
  const { setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const searchHandleRef = useRef<GlobalSearchHandle | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModK =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k";
      if (!isModK) return;
      event.preventDefault();
      searchHandleRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const logoSrc = resolvedTheme === "dark" ? "/logo-dark.png" : "/logo.png";

  return (
    <header className="sticky top-0 z-[60] flex h-14 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-card)]">
      {}
      <div className="hidden w-[18rem] shrink-0 items-center px-4 md:flex">
        <Link href="/painel" className="flex min-w-0 items-center">
          <Image
            src={logoSrc}
            alt="EnergivIA"
            width={420}
            height={120}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <OrganizationSwitcher />
        <div className="hidden min-w-0 flex-1 max-w-md sm:block">
          <GlobalSearch ref={searchHandleRef} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 px-3 md:gap-2">
        <a href="/chat" className="hidden sm:block">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-gradient-to-br from-violet-50 to-blue-50 px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:from-violet-100 hover:to-blue-100 dark:border-violet-800 dark:from-violet-950/40 dark:to-blue-950/40 dark:text-violet-400"
            title="Abrir assistente IA"
          >
            <Sparkles className="h-3.5 w-3.5" />
            IA
          </button>
        </a>
        <NotificationsBell />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {(profile ?? user) && (
          <span className="hidden max-w-[100px] truncate text-sm text-[var(--color-muted-foreground)] sm:block">
            {profile?.name ?? user?.name ?? user?.email}
          </span>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
