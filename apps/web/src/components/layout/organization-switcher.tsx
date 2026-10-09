"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useOrganization } from "@/components/providers/organization-provider";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { cn } from "@energivia/utils";

export function OrganizationSwitcher() {
  const { organizations, currentOrganization, setCurrentOrganizationId, loading } =
    useOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading || organizations.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn(
          "flex h-9 max-w-[140px] xs:max-w-[180px] sm:max-w-none items-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 dark:border-white/15 bg-white/[0.04] dark:bg-white/[0.06] px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-[var(--color-foreground)] shadow-xs backdrop-blur-md transition-all duration-200",
          "hover:bg-white/[0.09] hover:border-white/25 hover:shadow-sm"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="max-w-[65px] xs:max-w-[100px] sm:max-w-[180px] truncate">
          {currentOrganization?.name ?? "Organização"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-70" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#161d22]/95 py-1 shadow-2xl backdrop-blur-xl"
          role="listbox"
        >
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              role="option"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                currentOrganization?.id === org.id
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
              )}
              onClick={() => {
                setCurrentOrganizationId(org.id);
                setOpen(false);
              }}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{org.name}</span>
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-border)]" />
          <Link
            href="/configuracoes/organizacao?action=new"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] font-medium hover:bg-[var(--color-accent)] hover:text-[var(--color-primary)]"
            onClick={() => setOpen(false)}
          >
            <Plus className="h-4 w-4" />
            Adicionar nova empresa
          </Link>
          <Link
            href="/configuracoes/organizacao"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
            onClick={() => setOpen(false)}
          >
            <Building2 className="h-4 w-4" />
            Dados da organização atual
          </Link>
        </div>
      )}
    </div>
  );
}
