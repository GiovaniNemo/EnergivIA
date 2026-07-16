"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getMe,
  createOrganization,
  MeRequestError,
  type MeResponse,
  type Organization,
} from "@/lib/organizations-api";

const ORG_COOKIE = "energivia-organization-id";

function setOrganizationCookie(id: string | null) {
  if (typeof document === "undefined") return;
  if (id) {
    document.cookie = `${ORG_COOKIE}=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax`;
  } else {
    document.cookie = `${ORG_COOKIE}=;path=/;max-age=0`;
  }
}

interface OrganizationContextValue {
  user: MeResponse | null;
  organizations: Organization[];
  currentOrganizationId: string | null;
  currentOrganization: Organization | null;
  setCurrentOrganizationId: (id: string | null) => void;
  createOrg: (data: {
    name: string;
    logoUrl?: string;
    cnpj?: string;
    templateBusinessSegment?: string;
    templateRegion?: string;
    templateValueProposition?: string;
    templateTone?: string;
  }) => Promise<Organization>;
  refetch: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cookieId =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((r) => r.startsWith(`${ORG_COOKIE}=`))
              ?.split("=")[1]
          : null;
      const decoded = cookieId ? decodeURIComponent(cookieId) : undefined;
      const data = await getMe(decoded ?? undefined);
      setUser(data);
      const orgs = data.organizations ?? [];
      setOrganizations(orgs);
      let currentId = data.currentOrganizationId ?? decoded ?? orgs[0]?.id ?? null;
      if (orgs.length > 0 && (!currentId || !orgs.some((o) => o.id === currentId))) {
        currentId = orgs[0]?.id ?? null;
      }
      if (currentId && currentId !== decoded) setOrganizationCookie(currentId);
      setCurrentOrganizationIdState(currentId);
    } catch (e) {
      if (e instanceof MeRequestError && e.status === 401 && typeof window !== "undefined") {
        window.location.assign("/auth/login");
        return;
      }
      setError(e instanceof Error ? e : new Error(String(e)));
      setUser(null);
      setOrganizations([]);
      setCurrentOrganizationIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const setCurrentOrganizationId = useCallback((id: string | null) => {
    setCurrentOrganizationIdState(id);
    setOrganizationCookie(id);
  }, []);

  const createOrg = useCallback(
    async (data: {
      name: string;
      logoUrl?: string;
      cnpj?: string;
      templateBusinessSegment?: string;
      templateRegion?: string;
      templateValueProposition?: string;
      templateTone?: string;
    }) => {
      const org = await createOrganization(data);
      await refetch();
      setCurrentOrganizationId(org.id);
      return org;
    },
    [refetch, setCurrentOrganizationId]
  );

  const currentOrganization =
    currentOrganizationId && organizations.length > 0
      ? (organizations.find((o) => o.id === currentOrganizationId) ?? organizations[0]!)
      : (organizations[0] ?? null);

  const value: OrganizationContextValue = {
    user,
    organizations,
    currentOrganizationId,
    currentOrganization,
    setCurrentOrganizationId,
    createOrg,
    refetch,
    loading,
    error,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
