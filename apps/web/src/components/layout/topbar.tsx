"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useOrganization } from "@/components/providers/organization-provider";
import { useSidebar } from "@/components/layout/sidebar-inset";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Menu, UserRound, Timer, AlertTriangle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { GlobalSearch, type GlobalSearchHandle } from "@/components/layout/global-search";
import { BrandLogo } from "@/components/ui/brand-logo";
import { cn } from "@energivia/utils";
import Link from "next/link";
import { WhatsappConnectionModal } from "@/components/whatsapp/whatsapp-connection-modal";
import { getTrialDaysLeft } from "@/lib/business-days";

function userInitials(name?: string | null, email?: string | null): string {
  const clean = typeof name === "string" ? name.trim() : "";
  if (clean) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      const first = parts[0][0] || "";
      const last = parts[parts.length - 1]![0] || "";
      if (first || last) return `${first}${last}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  const cleanEmail = typeof email === "string" ? email.trim() : "U";
  return cleanEmail.slice(0, 2).toUpperCase();
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

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      className={props.className}
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.725-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.86.002-2.637-1.03-5.114-2.905-6.99C16.55 1.879 14.07 .847 11.433.847 6.003.847 1.58 5.267 1.577 10.697c0 1.694.441 3.354 1.278 4.818L1.876 21.034l5.912-1.547-1.14-.633zM17.522 14.4c-.302-.15-1.785-.88-2.062-.98-.277-.1-.479-.15-.679.15-.2.3-.779.98-.955 1.18-.177.2-.354.226-.656.076-.302-.15-1.274-.47-2.428-1.5-1.066-.96-1.58-1.79-1.78-2.09-.2-.3-.022-.46-.172-.61-.137-.13-.302-.35-.453-.53-.15-.17-.2-.3-.3-.5-.1-.2-.05-.38.026-.53.075-.15.679-.78.855-.98.176-.2.235-.33.352-.55.118-.22.059-.42-.03-.57-.088-.15-.679-1.636-.93-2.25-.245-.583-.496-.5-.679-.51-.177-.01-.38-.01-.58-.01-.2 0-.527.08-.8.38-.277.3-1.06 1.03-1.06 2.52s1.08 2.92 1.23 3.12c.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.58-.35z" />
    </svg>
  );
}

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { currentOrganization, user } = useOrganization();
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = !open && !isMobile;
  const searchHandleRef = useRef<GlobalSearchHandle>(null);
  const mobileSearchHandleRef = useRef<GlobalSearchHandle | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [customWaLogoUrl, setCustomWaLogoUrl] = useState<string>("");

  useEffect(() => {
    fetch("/api/proxy/system-settings/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setCustomWaLogoUrl(data?.whatsappLogoUrl || "");
      })
      .catch(() => {});
  }, []);

  const createdAt = currentOrganization?.createdAt ? new Date(currentOrganization.createdAt) : null;
  const trialDaysLeft = createdAt ? getTrialDaysLeft(createdAt, 5) : 5;

  const hasActiveSub = currentOrganization?.subscription?.status === "active";

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

  return (
    <header className="sticky top-0 z-[60] flex h-14 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-card)]">
      {/* Brand logo container aligning with sidebar */}
      <div
        className={cn(
          "hidden shrink-0 items-center border-r border-[var(--color-border)] h-full transition-[width] duration-200 md:flex",
          collapsed ? "w-20 justify-center px-2" : "w-[18rem] justify-center px-2.5"
        )}
      >
        <Link href="/painel" className="flex w-full h-full min-w-0 items-center justify-center">
          <BrandLogo collapsed={collapsed} />
        </Link>
      </div>

      {/* Page context / actions */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <OrganizationSwitcher />
        {/* Desktop Global Search */}
        <div className="hidden min-w-0 flex-1 max-w-md sm:block">
          <GlobalSearch ref={searchHandleRef} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 px-1.5 sm:gap-1.5 sm:px-3 md:gap-2">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="flex h-8 w-8 items-center justify-center rounded-lg sm:hidden text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Abrir pesquisa"
        >
          <Search className="h-4 w-4" />
        </Button>

        {!hasActiveSub &&
          (trialDaysLeft === 0 ? (
            <Link
              href="/gestao/meus-planos"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 shadow-sm transition-all hover:bg-rose-100 hover:scale-[1.02] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 dark:hover:bg-rose-900/60"
              title="Seu tempo de testes acabou. Clique para escolher seu plano e continuar."
            >
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 animate-pulse" />
              <span>Tempo de testes acabou</span>
            </Link>
          ) : (
            <Link
              href="/gestao/meus-planos"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-100 text-orange-800 text-xs font-semibold rounded-lg border border-orange-200 transition-colors hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50 dark:hover:bg-orange-900/60"
              title="Teste grátis"
            >
              <Timer className="h-4 w-4 text-orange-500" />
              <span>
                {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
              </span>
            </Link>
          ))}

        {/* WhatsApp AI Button (Responsive) */}
        <button
          type="button"
          onClick={() => setWhatsappModalOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-2 sm:h-9 sm:gap-1.5 sm:px-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 hover:from-emerald-600 hover:to-green-700 shrink-0"
          title="Conhecer IA no WhatsApp"
        >
          {customWaLogoUrl ? (
            <img
              src={customWaLogoUrl}
              alt="WhatsApp"
              className="h-4 w-4 shrink-0 object-contain rounded-sm"
            />
          ) : (
            <WhatsappIcon className="h-4 w-4 shrink-0 text-white" />
          )}
          <span className="hidden md:inline">IA no WhatsApp 💬</span>
          <span className="hidden xs:inline md:hidden text-[11px]">IA</span>
        </button>

        <NotificationsBell />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg sm:h-9 sm:w-9"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {user && (
          <span className="hidden max-w-[100px] truncate text-sm text-[var(--color-muted-foreground)] sm:block">
            {user.name ?? user.email}
          </span>
        )}
        <UserMenu />
      </div>

      {/* Mobile Search Dialog */}
      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="max-w-[95vw] p-4 sm:max-w-md top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Pesquisa Global</DialogTitle>
          <div className="pt-2">
            <GlobalSearch ref={mobileSearchHandleRef} onSelect={() => setMobileSearchOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <WhatsappConnectionModal open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen} />
    </header>
  );
}
