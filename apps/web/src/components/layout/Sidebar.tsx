"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSidebar } from "@/components/layout/sidebar-inset";
import { useOrganization } from "@/components/providers/organization-provider";
import { MENU_ITEMS, SECTION_LABELS, type SidebarSectionKey } from "@/config/menu.config";
import { BrandLogo } from "@/components/ui/brand-logo";
import { SidebarSection } from "./SidebarSection";
import { SidebarNotice } from "./sidebar-notice";
import { cn } from "@energivia/utils";
import { getTrialDaysLeft } from "@/lib/business-days";

const ADMIN_SURFACE_SECTIONS: ReadonlySet<SidebarSectionKey> = new Set(["admin", "platform"]);
const APP_SURFACE_SECTIONS: ReadonlySet<SidebarSectionKey> = new Set(["operation", "management"]);

type Surface = "admin" | "app" | "all";

const isLocalDevHost = (host: string): boolean =>
  host === "localhost" || host.startsWith("127.") || /^\d+\.\d+\.\d+\.\d+$/.test(host);

function detectSurface(_pathname: string | null): Surface {
  if (typeof window === "undefined") return "all";
  const host = window.location.hostname;
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("app.")) return "app";
  if (isLocalDevHost(host)) return "all";
  return "all";
}

const PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const { isPinned, togglePinned, isHovered, onHoverStart, onHoverEnd, mobileOpen, setMobileOpen } =
    useSidebar();
  const isMobile = useIsMobile();
  const isVisuallyExpanded = isPinned || isHovered;
  const collapsed = !isVisuallyExpanded && !isMobile;
  const showDrawer = isMobile && mobileOpen;
  const { user, currentOrganization } = useOrganization();
  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const orgRole = (currentOrganization?.role || "").toUpperCase();

  const isPlatform =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    orgRole === "PLATFORM" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  const isOwnerOrAdmin =
    isPlatform ||
    orgRole === "OWNER" ||
    orgRole === "ADMIN" ||
    globalRole === "OWNER" ||
    globalRole === "ADMIN";

  const createdAt = currentOrganization?.createdAt ? new Date(currentOrganization.createdAt) : null;
  const trialDaysLeft = createdAt ? getTrialDaysLeft(createdAt, 5) : 5;

  const [surface, setSurface] = useState<Surface>("all");
  useEffect(() => {
    setSurface(detectSurface(pathname));
  }, [pathname]);

  const sections = useMemo(() => {
    return (["operation", "management", "admin", "platform"] as SidebarSectionKey[])
      .map((sectionKey) => ({
        key: sectionKey,
        label: SECTION_LABELS[sectionKey],
        items: MENU_ITEMS.filter((item) => {
          if (item.section !== sectionKey) return false;

          if (surface === "admin" && !ADMIN_SURFACE_SECTIONS.has(sectionKey)) return false;
          if (surface === "app" && !APP_SURFACE_SECTIONS.has(sectionKey) && !isPlatform)
            return false;

          if (item.requiresRole === "platform" && !isPlatform) return false;
          if ((item.requiresRole === "admin" || item.requiresRole === "owner") && !isOwnerOrAdmin)
            return false;
          return true;
        }).map((item) => {
          if (item.label === "Meus Planos") {
            const hasActiveSub = currentOrganization?.subscription?.status === "active";
            return {
              ...item,
              badge: hasActiveSub
                ? undefined
                : trialDaysLeft === 0
                  ? "EXPIRADO"
                  : `${trialDaysLeft} ${trialDaysLeft === 1 ? "DIA" : "DIAS"}`,
            };
          }
          return item;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [isOwnerOrAdmin, isPlatform, surface, currentOrganization, trialDaysLeft]);

  const activeMenuPath = useMemo(() => {
    const currentPath = (pathname ?? "").replace(/\/$/, "");
    const normalizedPath = currentPath || "/";
    const matched = [...MENU_ITEMS]
      .map((item) => item.path.replace(/\/$/, "") || "/")
      .filter(
        (itemPath) =>
          normalizedPath === itemPath ||
          (itemPath !== "/painel" && normalizedPath.startsWith(`${itemPath}/`))
      )
      .sort((a, b) => b.length - a.length);
    return matched[0] ?? "";
  }, [pathname]);

  const isActive = (path: string) => {
    const normalized = path.replace(/\/$/, "") || "/";
    return activeMenuPath === normalized;
  };

  const isTrialLimitReached = Boolean(
    (user?.isTrial && (user?.trialExpired || user?.isTrialProposalLimitReached)) ||
    (!user?.isTrial && user?.isProposalLimitReached)
  );
  const closeOnMobile = isMobile ? () => setMobileOpen(false) : undefined;

  return (
    <>
      {showDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      {/* Spacer estrutural no fluxo da página para liberar área útil às telas em auto-collapse (5.25rem) ou fixo (17rem) */}
      {!isMobile && (
        <div
          className={cn(
            "hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:block pointer-events-none",
            isPinned ? "w-[17rem]" : "w-[5.25rem]"
          )}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={!isMobile ? onHoverStart : undefined}
        onMouseLeave={!isMobile ? onHoverEnd : undefined}
        className={cn(
          "flex flex-col transition-[width,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          showDrawer
            ? "fixed inset-y-2 left-2 z-[90] w-[calc(100%-1rem)] max-w-[280px] rounded-3xl glass-nav-sidebar shadow-2xl flex overflow-hidden"
            : cn(
                "fixed top-20 left-3 bottom-3 z-40 hidden md:flex rounded-3xl glass-nav-sidebar",
                isHovered && !isPinned && "glass-nav-sidebar-floating"
              )
        )}
        style={showDrawer ? undefined : { width: collapsed ? "4.5rem" : "16rem" }}
      >
        {showDrawer ? (
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/painel" onClick={() => setMobileOpen(false)} className="flex items-center">
              <BrandLogo size="sm" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="h-3" />
        )}

        {showDrawer && isTrialLimitReached ? (
          <div className="mx-3 mt-2.5 mb-1 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 p-3 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-300">
                  {user?.isTrialProposalLimitReached
                    ? "Limite de 20 propostas atingido"
                    : user?.trialExpired
                      ? "Período de testes finalizado"
                      : `Limite de ${user?.proposalsLimit ?? 50} propostas atingido`}
                </p>
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  {user?.isTrialProposalLimitReached
                    ? "Você atingiu o limite de 20 propostas gratuitas do período de teste. Faça upgrade para continuar gerando propostas comerciais com IA."
                    : "Faça upgrade do seu plano para continuar gerando propostas comerciais com IA."}
                </p>
                <div className="pt-1.5">
                  <Link
                    href="/gestao/meus-planos"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 shadow-sm"
                  >
                    Ver Planos e Assinar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 min-h-0 flex flex-col">
          <nav className="flex-1 space-y-4 overflow-y-auto pb-10 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((section) => (
              <SidebarSection
                key={section.key}
                label={section.label}
                items={section.items}
                collapsed={collapsed}
                isActive={isActive}
                onItemClick={closeOnMobile}
              />
            ))}
          </nav>

          {/* Efeito translúcido na parte inferior da sidebar */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[var(--color-sidebar)] via-[var(--color-sidebar)]/70 to-transparent backdrop-blur-[3px] [mask-image:linear-gradient(to_top,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_50%,transparent_100%)] rounded-b-3xl z-10"
            aria-hidden="true"
          />
        </div>

        {/* System Announcement Notice */}
        <SidebarNotice collapsed={collapsed} />

        {!isMobile ? (
          <button
            type="button"
            onClick={togglePinned}
            className={cn(
              "absolute -right-3 top-5 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/10 bg-white/95 dark:bg-[#1e262b] text-neutral-600 dark:text-white/70 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:text-black dark:hover:text-white hover:border-emerald-500/40",
              isPinned &&
                "border-emerald-500/40 text-emerald-600 dark:text-emerald-300 bg-emerald-50/95 dark:bg-emerald-950/80 shadow-emerald-500/20"
            )}
            title={isPinned ? "Desafixar menu (ativar auto-esconder)" : "Fixar menu aberto"}
            aria-label={isPinned ? "Desafixar menu" : "Fixar menu aberto"}
          >
            {isPinned ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </aside>
    </>
  );
}
