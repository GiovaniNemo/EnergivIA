"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSidebar } from "@/components/layout/sidebar-inset";
import { useOrganization } from "@/components/providers/organization-provider";
import { MENU_ITEMS, SECTION_LABELS, type SidebarSectionKey } from "@/config/menu.config";
import { SidebarSection } from "./SidebarSection";
import { cn } from "@energivia/utils";

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

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = !open && !isMobile;
  const showDrawer = isMobile && open;
  const { user } = useOrganization();
  const userRole = user?.role ?? null;

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
          if (surface === "app" && !APP_SURFACE_SECTIONS.has(sectionKey)) return false;

          if (item.requiresRole === "platform" && userRole !== "PLATFORM") return false;
          if (
            (item.requiresRole === "admin" || item.requiresRole === "owner") &&
            userRole !== "OWNER" &&
            userRole !== "ADMIN" &&
            userRole !== "PLATFORM"
          )
            return false;
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole, surface]);

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

  const closeOnMobile = isMobile ? () => setOpen(false) : undefined;

  return (
    <>
      {showDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <aside
        className={cn(
          "relative z-50 flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-[width] duration-200",
          !open && "hidden md:flex",
          showDrawer && "fixed inset-0 w-full shadow-2xl"
        )}
        style={showDrawer ? undefined : { width: collapsed ? "5rem" : "18rem" }}
      >
        {showDrawer ? (
          <div className="flex items-center justify-end px-3 pb-2 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="h-3" />
        )}

        <nav className="flex-1 space-y-4 overflow-y-auto pb-5 pt-1">
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
