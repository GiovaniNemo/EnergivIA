"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { AdminThemeProvider } from "@/components/admin/theme-provider";
import { Boxes, Award, Truck, LayoutTemplate, ShieldCheck } from "lucide-react";

const PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

interface AdminTab {
  label: string;
  href: string;
  icon: typeof Boxes;
  badge?: string;
}

const tabs: AdminTab[] = [
  {
    label: "Modelos de Template",
    href: "/admin/modelos-template",
    icon: LayoutTemplate,
    badge: "Oficial",
  },
  {
    label: "Produtos & Kits",
    href: "/admin/produtos",
    icon: Boxes,
  },
  {
    label: "Marcas & Fabricantes",
    href: "/admin/marcas",
    icon: Award,
  },
  {
    label: "Fornecedores & Distribuidores",
    href: "/admin/distribuidores",
    icon: Truck,
  },
];

function isStandaloneAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (
    normalized.startsWith("/admin/modelos-template/") ||
    normalized.startsWith("/admin/template-models/") ||
    normalized.startsWith("/admin/planos") ||
    normalized.startsWith("/admin/metricas") ||
    normalized.startsWith("/admin/sistema") ||
    normalized.startsWith("/admin/acessos-especiais") ||
    normalized.startsWith("/admin/integradores")
  );
}

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentOrganization } = useOrganization();
  const standalone = isStandaloneAdminPath(pathname);

  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const orgRole = (currentOrganization?.role || "").toUpperCase();

  const isPlatform =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    orgRole === "PLATFORM" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  useEffect(() => {
    if (user && !isPlatform) {
      router.replace("/painel");
    }
  }, [user, isPlatform, router]);

  if (user && !isPlatform) {
    return null;
  }

  if (standalone) {
    return <AdminThemeProvider>{children}</AdminThemeProvider>;
  }

  const activeHref = pathname?.startsWith("/admin/modelos-template")
    ? "/admin/modelos-template"
    : pathname?.startsWith("/admin/marcas")
      ? "/admin/marcas"
      : pathname?.startsWith("/admin/distribuidores")
        ? "/admin/distribuidores"
        : pathname?.startsWith("/admin/produtos")
          ? "/admin/produtos"
          : "/admin/modelos-template";

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-[var(--color-background)] pb-12 text-[var(--color-text)]">
        {/* Header Catálogo Master */}
        <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin · Catálogo Master</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Catálogo & Recursos Globais
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Gerencie modelos oficiais de proposta, equipamentos solares, fabricantes
                  homologados e distribuidores integrados.
                </p>
              </div>
            </div>

            {/* Pill Navigation Tabs */}
            <nav
              className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
              aria-label="Abas do Catálogo"
            >
              {tabs.map(({ label, href, icon: Icon, badge }) => {
                const isActive = activeHref === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group relative inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-sm shadow-emerald-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 transition-colors ${isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
                    />
                    <span>{label}</span>
                    {badge && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          isActive
                            ? "bg-emerald-500/25 text-emerald-200"
                            : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Content Body */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">{children}</main>
      </div>
    </AdminThemeProvider>
  );
}
