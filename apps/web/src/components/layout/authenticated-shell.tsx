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
import { WelcomeIntroSplash } from "@/components/layout/welcome-intro-splash";

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
            <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--color-background)]">
              <TrialLockOverlay />
              {isFullscreenTemplateEditor ||
              isFullscreenBlueprintEditor ||
              isOnboardingOrganization ? (
                <main className="flex-1 overflow-hidden bg-[var(--color-background)] p-0">
                  {children}
                </main>
              ) : (
                <SidebarProvider>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <Topbar />
                    <div className="flex min-h-0 flex-1 overflow-hidden">
                      <AppSidebar />
                      <SidebarInset>
                        <main
                          className={`flex-1 min-w-0 w-full max-w-full bg-[var(--color-background)] ${isFullscreenChat ? "overflow-hidden p-0" : "overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6"}`}
                        >
                          {isFullscreenChat ? (
                            children
                          ) : (
                            <div className="mx-auto w-full max-w-[1400px] min-w-0">{children}</div>
                          )}
                        </main>
                      </SidebarInset>
                    </div>
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
