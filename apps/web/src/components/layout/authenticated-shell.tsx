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

              {/* Fundo Atmosférico Contínuo para Glassmorphism (Vibrant Frosted Orbs estilo referência) */}
              <div
                className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
                aria-hidden="true"
              >
                {/* Esfera 1: Esfera luminosa de topo/esquerda atrás da logo e sidebar */}
                <div
                  className="absolute -top-24 -left-20 h-[650px] w-[650px] rounded-full blur-[110px] bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.32)_0%,rgba(16,185,129,0.16)_40%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.24)_0%,rgba(16,185,129,0.12)_40%,transparent_70%)]"
                  style={{ contain: "strict" }}
                />
                {/* Esfera 2: Esfera ciano/teal suave na lateral da sidebar */}
                <div
                  className="absolute top-[32%] -left-28 h-[600px] w-[550px] rounded-full blur-[120px] bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.26)_0%,rgba(6,182,212,0.12)_45%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18)_0%,rgba(6,182,212,0.08)_45%,transparent_70%)]"
                  style={{ contain: "strict" }}
                />
                {/* Esfera 3: Aurora expansiva periwinkle/esmeralda no topo atrás da topbar */}
                <div
                  className="absolute -top-36 left-1/2 -translate-x-1/2 h-[520px] w-[950px] rounded-full blur-[130px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.16)_0%,rgba(16,185,129,0.14)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12)_0%,rgba(16,185,129,0.10)_45%,transparent_75%)]"
                  style={{ contain: "strict" }}
                />
                {/* Esfera 4: Bloom ciano/safira suave na base direita */}
                <div
                  className="absolute -bottom-24 -right-24 h-[750px] w-[750px] rounded-full blur-[140px] bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.20)_0%,rgba(56,189,248,0.09)_50%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.15)_0%,rgba(56,189,248,0.06)_50%,transparent_75%)]"
                  style={{ contain: "strict" }}
                />
                {/* Camada 5: Micro-textura arquitetônica 100% contínua */}
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.045] bg-[radial-gradient(rgba(0,0,0,0.8)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:24px_24px]"
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
