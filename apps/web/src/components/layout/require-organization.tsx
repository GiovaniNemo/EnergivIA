"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { MeRequestError } from "@/lib/organizations-api";
import { LoadingState } from "@/components/ui/loading-state";

const CREATE_ORG_PATH = "/create-organization";

const ORG_AGNOSTIC_PREFIXES = ["/admin", "/plataforma"];

const isOrgAgnosticPath = (path: string | null): boolean => {
  if (!path) return false;
  return ORG_AGNOSTIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
};

export function RequireOrganization({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { organizations, loading, error, user } = useOrganization();
  const isPlatform = user?.role === "PLATFORM";
  const orgAgnostic = isOrgAgnosticPath(pathname);

  useEffect(() => {
    if (loading || pathname === CREATE_ORG_PATH) return;
    if (error) return;
    if (isPlatform || orgAgnostic) return;
    if (organizations.length === 0) {
      router.replace(CREATE_ORG_PATH);
    }
  }, [loading, error, organizations.length, pathname, router, isPlatform, orgAgnostic]);

  if (loading && organizations.length === 0) {
    return <LoadingState fullScreen label="Carregando sua empresa" />;
  }

  if (pathname === CREATE_ORG_PATH) {
    return <>{children}</>;
  }

  if (!loading && error) {
    const hint = error instanceof MeRequestError ? error.hint : undefined;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{error.message}</p>
        {hint ? (
          <p className="max-w-md text-xs text-[var(--color-muted-foreground)]">{hint}</p>
        ) : null}
      </div>
    );
  }

  if (!loading && organizations.length === 0 && !isPlatform && !orgAgnostic) {
    return null;
  }

  return <>{children}</>;
}
