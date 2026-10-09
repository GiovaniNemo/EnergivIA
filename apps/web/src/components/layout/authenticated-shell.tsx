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

              {/* Luz ambiente no topo para realçar a refração do vidro na Topbar e Sidebar */}
              <div
                className="pointer-events-none fixed -top-20 left-1/3 -translate-x-1/2 h-60 w-[900px] bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(16,185,129,0.22),transparent_70%)] blur-2xl z-0"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none fixed -top-20 right-1/4 h-56 w-[700px] bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(20,184,166,0.18),transparent_70%)] blur-2xl z-0"
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
                        className={`flex-1 min-w-0 w-full max-w-full ${isFullscreenChat ? "overflow-hidden p-0 pt-16" : "overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pt-20 sm:pt-20 md:pt-22"}`}
                      >
                        {isFullscreenChat ? (
                          children
                        ) : (
                          <div className="mx-auto w-full max-w-[1680px] min-w-0 transition-all duration-300">
                            {children}
                          </div>
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
