"use client";

import { useMemo, useState } from "react";
import { FileText, Smartphone } from "lucide-react";
import { WhatsappFlowSimulator } from "./whatsapp-flow-simulator";

import { MockProposalPreview, type ProposalMockType } from "./mock-proposal-previews";

type HowItWorksTabId = "whatsapp" | "propostas";

const tabs: Array<{ id: HowItWorksTabId; label: string; description: string }> = [
  {
    id: "whatsapp",
    label: "Operação no WhatsApp",
    description: "Execute todo o fluxo de propostas direto no WhatsApp.",
  },
  {
    id: "propostas",
    label: "Propostas geradas",
    description: "Apresente documentos claros, profissionais e prontos para fechar.",
  },
];

const proposalPreviewItems: Array<{
  id: string;
  title: string;
  subtitle: string;
  type: ProposalMockType;
}> = [
  {
    id: "p1",
    title: "Proposta residencial",
    subtitle: "Cliente: Família Santana",
    type: "residential",
  },
  {
    id: "p2",
    title: "Proposta comercial",
    subtitle: "Cliente: Mercado Central",
    type: "commercial",
  },
  {
    id: "p3",
    title: "Proposta industrial",
    subtitle: "Cliente: Fábrica Horizonte",
    type: "industrial",
  },
];

export function HowItWorksTabs(): JSX.Element {
  const [activeTab, setActiveTab] = useState<HowItWorksTabId>("whatsapp");

  const tabIcon = useMemo(() => {
    if (activeTab === "whatsapp") return <Smartphone className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  }, [activeTab]);

  return (
    <section
      id="como-funciona"
      className="relative border-t border-white/5 bg-[#02040a] px-4 py-20 sm:px-6 sm:py-24 overflow-hidden"
    >
      {/* Subtle ambient light glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.07),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-1.5 mb-4 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-sm shadow-[0_0_15px_rgba(56,189,248,0.15)]">
            <span className="text-[#38bdf8] text-xs font-bold uppercase tracking-[0.25em]">
              DEMONSTRAÇÃO INTERATIVA
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Como funciona na prática
          </h2>
          <p className="mx-auto mt-4 text-base sm:text-lg text-slate-400">
            Veja uma demonstração rápida do fluxo comercial com IA, WhatsApp e propostas prontas
            para apresentar ao cliente.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mt-10 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:grid-cols-2 backdrop-blur-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-xl px-5 py-4 text-left transition-all duration-300 relative overflow-hidden group",
                  isActive
                    ? "border border-cyan-500/40 bg-gradient-to-r from-cyan-950/50 via-[#0a1424]/80 to-[#070b14]/80 shadow-[0_0_25px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/30"
                    : "border border-transparent bg-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 hover:border-white/5",
                ].join(" ")}
                aria-pressed={isActive}
              >
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#8b5cf6]" />
                )}
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-300"}`}
                  >
                    {tab.label}
                  </p>
                  {isActive && (
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse" />
                  )}
                </div>
                <p
                  className={["mt-1 text-xs", isActive ? "text-slate-300" : "text-slate-500"].join(
                    " "
                  )}
                >
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Main Interactive Container */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#060a12]/90 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(56,189,248,0.05)] ring-1 ring-cyan-500/10">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#090e1a]/60 px-6 py-3.5 text-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-400">{tabIcon}</span>
              <p className="text-sm font-semibold tracking-wide">
                {tabs.find((tab) => tab.id === activeTab)?.label ?? "Demonstração"}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">EnergivIA AI Flow</span>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeTab === "whatsapp" ? <WhatsappDemoContent /> : null}
            {activeTab === "propostas" ? <ProposalsDemoContent /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsappDemoContent(): JSX.Element {
  return <WhatsappFlowSimulator />;
}

function ProposalsDemoContent(): JSX.Element {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-300 font-light">
        Prévia de propostas geradas automaticamente com dados técnicos e financeiros do cliente.
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        {proposalPreviewItems.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#070b14]/80 shadow-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(56,189,248,0.15)]"
          >
            <div className="h-[290px] sm:h-[310px] w-full p-2.5 sm:p-3 bg-[#03060c]">
              <MockProposalPreview
                type={item.type}
                clientName={item.subtitle.replace("Cliente: ", "")}
                compact
              />
            </div>
            <div className="border-t border-white/10 bg-[#090d18]/80 p-4">
              <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
