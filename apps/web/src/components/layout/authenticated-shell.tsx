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
  const isFullscreenBlueprintEditor = /^\/admin\/(template-models|modelos-template)\/[^/]+$/.test(
    normalizedPath
  );
  const isOnboardingOrganization = normalizedPath === "/create-organization";
  const isFullscreenChat = normalizedPath === "/chat";
  const isFullscreenView =
    isFullscreenTemplateEditor || isFullscreenBlueprintEditor || isOnboardingOrganization;

  return (
    <OrganizationProvider>
      <WelcomeIntroSplash />
      <RequireOrganization>
        <AppMuiThemeProvider>
          <ProposalStudyProvider>
            <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[var(--color-background)]">
              <TrialLockOverlay />
              {!isFullscreenView && <FeedbackPromptCard />}
              {!isFullscreenView && <EnergiviaFloatingHub />}

              {/* Fundo Atmosférico Contínuo para Glassmorphism (Preenchimento Integral sem quebras) */}
              <div
                className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
                aria-hidden="true"
              >
                {/* Camada 1: Aura esmeralda expansiva no topo e centro */}
                <div
                  className="absolute -top-32 left-1/2 -translate-x-1/2 h-[700px] w-full max-w-[1500px] rounded-full bg-[radial-gradient(ellipse_75%_65%_at_50%_20%,rgba(16,185,129,0.12)_0%,rgba(16,185,129,0.03)_50%,transparent_80%)] dark:bg-[radial-gradient(ellipse_75%_65%_at_50%_20%,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.03)_50%,transparent_80%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 2: Luz suave teal/safira na lateral direita e base */}
                <div
                  className="absolute -bottom-20 right-0 h-[750px] w-[850px] rounded-full bg-[radial-gradient(ellipse_65%_60%_at_60%_60%,rgba(20,184,166,0.08)_0%,rgba(56,189,248,0.02)_55%,transparent_80%)] dark:bg-[radial-gradient(ellipse_65%_60%_at_60%_60%,rgba(14,116,144,0.10)_0%,rgba(16,185,129,0.03)_50%,transparent_80%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 3: Luz de apoio na lateral esquerda atrás da sidebar */}
                <div
                  className="absolute top-16 -left-20 h-[900px] w-[500px] rounded-full bg-[radial-gradient(ellipse_60%_60%_at_30%_40%,rgba(16,185,129,0.12)_0%,rgba(20,184,166,0.04)_50%,transparent_75%)] dark:bg-[radial-gradient(ellipse_60%_60%_at_30%_40%,rgba(16,185,129,0.18)_0%,rgba(20,184,166,0.06)_50%,transparent_75%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 4: Micro-textura arquitetônica 100% contínua (sem corte de máscara elíptica) */}
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.055] bg-[radial-gradient(rgba(0,0,0,0.8)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:24px_24px]"
                  style={{ contain: "strict" }}
                />
              </div>

              {isFullscreenView ? (
                <main className="relative z-10 flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-[var(--color-background)] p-0">
                  {children}
                </main>
              ) : (
                <SidebarProvider>
                  <Topbar />
                  <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
