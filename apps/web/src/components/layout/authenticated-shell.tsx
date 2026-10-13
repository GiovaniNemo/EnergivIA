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

              {/* Fundo Atmosférico de Alta Performance para Glassmorphism */}
              <div
                className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
                aria-hidden="true"
              >
                {/* Camada 1: Aura esmeralda refinada no topo/centro (energia solar) */}
                <div
                  className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[1100px] rounded-full bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(16,185,129,0.12)_0%,rgba(16,185,129,0.03)_55%,transparent_80%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.03)_55%,transparent_80%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 2: Luz suave teal/safira na lateral direita inferior */}
                <div
                  className="absolute -bottom-40 right-0 h-[600px] w-[750px] rounded-full bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(20,184,166,0.08)_0%,rgba(56,189,248,0.02)_55%,transparent_80%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(14,116,144,0.10)_0%,rgba(15,23,42,0.03)_55%,transparent_80%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 3: Luz de apoio na lateral esquerda atrás da sidebar */}
                <div
                  className="absolute top-24 -left-20 h-[700px] w-[450px] rounded-full bg-[radial-gradient(ellipse_60%_60%_at_30%_40%,rgba(16,185,129,0.07)_0%,transparent_75%)] dark:bg-[radial-gradient(ellipse_60%_60%_at_30%_40%,rgba(16,185,129,0.09)_0%,transparent_75%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 4: Micro-textura arquitetônica (Grid pontilhado fino para refração tátil de vidro) */}
                <div
                  className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07] bg-[radial-gradient(rgba(0,0,0,0.8)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_45%,black_40%,transparent_95%)]"
                  style={{ contain: "strict" }}
                />
              </div>

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
