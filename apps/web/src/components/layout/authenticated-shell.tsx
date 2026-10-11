"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider, SidebarInset } from "@/components/layout/sidebar-inset";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { AppMuiThemeProvider } from "@/components/providers/app-mui-theme-provider";
import { RequireOrganization } from "@/components/layout/require-organization";
import { ProposalStudyProvider } from "@/components/pipeline/proposal-study-provider";
import { TrialLockOverlay } from "@/components/TrialLockOverlay";
import { FeedbackPromptCard } from "@/components/feedback/FeedbackPromptCard";
import { WelcomeIntroSplash } from "@/components/layout/welcome-intro-splash";
import { EnergiviaFloatingHub } from "@/components/layout/EnergiviaFloatingHub";

export function AuthenticatedShell({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const normalizedPath = (pathname ?? "").replace(/\/$/, "") || "/";
  const isFullscreenTemplateEditor =
    /^\/propostas\/templates\/[^/]+$/.test(normalizedPath) ||
    /^\/proposals\/templates\/[^/]+$/.test(normalizedPath);
  const isFullscreenBlueprintEditor =
    /^\/admin\/template-models\/[^/]+$/.test(normalizedPath) &&
    normalizedPath !== "/admin/modelos-template";
  const isOnboardingOrganization = normalizedPath === "/create-organization";
  const isFullscreenChat = normalizedPath === "/chat";

  return (
    <OrganizationProvider>
      <WelcomeIntroSplash />
      <RequireOrganization>
        <AppMuiThemeProvider>
          <ProposalStudyProvider>
            <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[var(--color-background)]">
              <TrialLockOverlay />
              {!isOnboardingOrganization && <FeedbackPromptCard />}
              {!isOnboardingOrganization && <EnergiviaFloatingHub />}

              {/* Luz ambiente no topo e lateral com gradientes suaves de alto desempenho (sem filtros pesados de desfoque) */}
              <div
                className="pointer-events-none fixed -top-20 left-1/3 -translate-x-1/2 h-64 w-[900px] bg-[radial-gradient(ellipse_80%_65%_at_50%_0%,rgba(16,185,129,0.16)_0%,rgba(16,185,129,0.05)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_65%_at_50%_0%,rgba(16,185,129,0.22)_0%,rgba(16,185,129,0.07)_45%,transparent_75%)] z-0"
                style={{ contain: "strict" }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none fixed -top-20 right-1/4 h-56 w-[700px] bg-[radial-gradient(ellipse_80%_65%_at_50%_0%,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.04)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_65%_at_50%_0%,rgba(20,184,166,0.18)_0%,rgba(20,184,166,0.05)_45%,transparent_75%)] z-0"
                style={{ contain: "strict" }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none fixed top-16 left-0 h-[600px] w-72 bg-[radial-gradient(ellipse_70%_80%_at_0%_30%,rgba(16,185,129,0.12)_0%,rgba(16,185,129,0.04)_45%,transparent_75%)] z-0"
                style={{ contain: "strict" }}
                aria-hidden="true"
              />

              {isFullscreenTemplateEditor ||
              isFullscreenBlueprintEditor ||
              isOnboardingOrganization ? (
                <main className="relative z-10 flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-[var(--color-background)] p-0">
                  {children}
                </main>
              ) : (
                <SidebarProvider>
                  <Topbar />
                  <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
                    <AppSidebar />
                    <SidebarInset>
                      <main
                        className={`flex-1 min-w-0 w-full max-w-full ${isFullscreenChat ? "overflow-hidden p-0 pt-24" : "overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 pt-24 sm:pt-28 md:pt-28"}`}
                      >
                        {isFullscreenChat ? (
                          children
                        ) : (
                          <div className="mx-auto w-full max-w-[1680px] min-w-0">{children}</div>
                        )}
                      </main>
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              )}
            </div>
          </ProposalStudyProvider>
        </AppMuiThemeProvider>
      </RequireOrganization>
    </OrganizationProvider>
  );
}
