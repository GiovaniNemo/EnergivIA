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
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = !open && !isMobile;
  const showDrawer = isMobile && open;
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
  const closeOnMobile = isMobile ? () => setOpen(false) : undefined;

  return (
    <>
      {showDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-[width] duration-200",
          !open && "hidden md:flex",
          showDrawer ? "fixed inset-0 z-[90] w-full shadow-2xl flex" : "relative z-30"
        )}
        style={showDrawer ? undefined : { width: collapsed ? "5rem" : "18rem" }}
      >
        {showDrawer ? (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Link href="/painel" onClick={() => setOpen(false)} className="flex items-center">
              <BrandLogo size="sm" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
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
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 shadow-sm"
                  >
                    Ver Planos e Assinar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 space-y-4 overflow-y-auto pb-5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

        {/* System Announcement Notice */}
        <SidebarNotice collapsed={collapsed} />

        {!isMobile ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-sidebar)] text-[var(--color-muted-foreground)] shadow-md transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </aside>
    </>
  );
}
