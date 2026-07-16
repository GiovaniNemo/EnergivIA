"use client";

import { useMemo } from "react";
import { PreviewDocument } from "@/components/proposals/editor/preview-document";
import { createScratchProposalDocument } from "@/components/proposals/scratch-template-document";
import { mergeTemplateBootstrapIntoDocument } from "@/lib/merge-template-bootstrap";
import { fakeTemplateBootstrap } from "@/components/landing/fake-template-bootstrap";

export default function FakePublicProposalPage(): JSX.Element {
  const documentState = useMemo(() => {
    const base = createScratchProposalDocument();
    const doc = mergeTemplateBootstrapIntoDocument(base, fakeTemplateBootstrap, {
      coverImageUrl: "/cover-segments/comercial/7.png",
      logoUrl: "/logo.png",
      audienceLabel: "Comercial",
      organizationName: "EnergivIA",
    });

    return {
      ...doc,
      variables: {
        ...doc.variables,
        nome_cliente: "Carlos Mendes",
        nome_empresa: "EnergivIA",
        data_proposta: new Date().toLocaleDateString("pt-BR"),
        economia_mensal: "R$ 850,00",
        payback_anos: "4,5 anos",
        investimento_total: "R$ 25.800,00",
        producao_anual: "10.920 kWh/ano",
      },
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-background)] py-6">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0A4A63]">
            Proposta demonstrativa
          </p>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
            Sistema solar comercial - simulação EnergivIA
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Render usando os mesmos componentes de template da plataforma.
          </p>
        </div>

        <PreviewDocument
          title="Proposta demonstrativa EnergivIA"
          documentState={documentState}
          mode="web"
          viewport="desktop"
          publicLayout
        />
      </div>
    </main>
  );
}
