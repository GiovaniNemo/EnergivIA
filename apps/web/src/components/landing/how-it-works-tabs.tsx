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
    if (activeTab === "whatsapp") return <Smartphone className="h-5 w-5 text-emerald-600" />;
    return <FileText className="h-5 w-5 text-emerald-600" />;
  }, [activeTab]);

  return (
    <section
      id="como-funciona"
      className="border-t border-slate-200 bg-slate-50/70 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Passo a passo
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Como funciona na prática
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Veja uma demonstração rápida do fluxo comercial com IA, WhatsApp e propostas prontas
            para apresentar ao cliente.
          </p>
        </div>

        <div className="mt-10 grid gap-3 rounded-2xl border border-slate-200 bg-slate-200/60 p-1.5 sm:grid-cols-2">
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
                    ? "bg-white text-slate-900 font-semibold shadow-sm border border-slate-200/80"
                    : "bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900",
                ].join(" ")}
                aria-pressed={isActive}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p
                  className={[
                    "mt-1 text-xs",
                    isActive ? "text-slate-500 font-normal" : "text-slate-500",
                  ].join(" ")}
                >
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-slate-800">
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
      <p className="text-sm text-slate-600">
        Prévia de propostas geradas automaticamente com dados técnicos e financeiros do cliente.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {proposalPreviewItems.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="h-[290px] sm:h-[310px] w-full p-2.5 sm:p-3 bg-slate-50/50">
              <MockProposalPreview
                type={item.type}
                clientName={item.subtitle.replace("Cliente: ", "")}
                compact
              />
            </div>
            <div className="border-t border-slate-100 bg-white p-3.5">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
