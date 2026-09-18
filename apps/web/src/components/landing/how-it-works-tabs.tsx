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
      className="border-t border-slate-800 bg-slate-950 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Como funciona na prática
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Veja uma demonstração rápida do fluxo comercial com IA, WhatsApp e propostas prontas
            para apresentar ao cliente.
          </p>
        </div>

        <div className="mt-10 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 sm:grid-cols-2 backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-xl px-5 py-3.5 text-left transition-all duration-200",
                  isActive
                    ? "bg-emerald-400 text-slate-950 font-bold shadow-[0_0_25px_rgba(52,211,153,0.3)] ring-1 ring-emerald-300"
                    : "bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                ].join(" ")}
                aria-pressed={isActive}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p
                  className={[
                    "mt-1 text-xs",
                    isActive ? "text-slate-900 font-medium" : "text-slate-500",
                  ].join(" ")}
                >
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3 text-slate-200">
            {tabIcon}
            <p className="text-sm font-semibold">
              {tabs.find((tab) => tab.id === activeTab)?.label ?? "Demonstração"}
            </p>
          </div>

          <div className="p-4 sm:p-6">
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
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Prévia de propostas geradas automaticamente com dados técnicos e financeiros do cliente.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {proposalPreviewItems.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg transition-all duration-300 hover:border-emerald-500/50 hover:shadow-emerald-500/10"
          >
            <div className="h-[290px] sm:h-[310px] w-full p-2.5 sm:p-3">
              <MockProposalPreview
                type={item.type}
                clientName={item.subtitle.replace("Cliente: ", "")}
                compact
              />
            </div>
            <div className="border-t border-slate-800 bg-slate-950/80 p-3.5">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
