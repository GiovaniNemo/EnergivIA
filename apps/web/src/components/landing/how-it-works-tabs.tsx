"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FileText, Smartphone } from "lucide-react";

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

const proposalPreviewItems = [
  { id: "p1", title: "Proposta residencial", subtitle: "Cliente: Família Santana" },
  { id: "p2", title: "Proposta comercial", subtitle: "Cliente: Mercado Central" },
  { id: "p3", title: "Proposta industrial", subtitle: "Cliente: Fábrica Horizonte" },
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

        <div className="mt-10 grid gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-2 sm:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-xl px-4 py-3 text-left transition-all",
                  isActive
                    ? "bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-950 shadow-md"
                    : "bg-transparent text-slate-300 hover:bg-slate-800",
                ].join(" ")}
                aria-pressed={isActive}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p
                  className={[
                    "mt-1 text-xs",
                    isActive ? "text-slate-900/90" : "text-slate-400",
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
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Aqui entra o vídeo real do fluxo completo no WhatsApp: envio da conta, análise da IA,
        simulação, seleção de kit e geração/envio da proposta. A estrutura já está pronta para
        receber seu arquivo final.
      </p>
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
        <video
          controls
          preload="metadata"
          poster="/landing/demo.png"
          className="h-[260px] w-full bg-black object-contain sm:h-[360px]"
        >
          Seu navegador não suporta reprodução de vídeo.
        </video>
      </div>
      <p className="text-xs text-slate-400">
        Assim que o vídeo final for enviado, basta atualizar o caminho no source da tab.
      </p>
    </div>
  );
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
            className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm"
          >
            <Image
              src="/landing/demo.png"
              alt={item.title}
              width={1080}
              height={675}
              className="h-36 w-full border-b border-slate-700 object-cover"
              unoptimized
            />
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
