"use client";

import { useEffect, useMemo, useState } from "react";
import { PreviewDocument } from "@/components/proposals/editor/preview-document";
import { LoadingState } from "@/components/ui/loading-state";
import { getPublicProposal, type PublicProposalPayload } from "@/lib/public-proposals-api";
import { buildGenerationConsumptionChartFromSimulation } from "@/lib/generation-consumption-series";
import { mergePublicProposalVariables } from "@/lib/public-proposal-variables";
import { templateConfigToPreviewDocument } from "@/lib/proposal-template-document";

export function PublicProposalView({ proposalId }: { proposalId: string }): JSX.Element {
  const [data, setData] = useState<PublicProposalPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    getPublicProposal(proposalId)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Não foi possível carregar proposta.")
      );
  }, [proposalId]);

  const documentState = useMemo(() => {
    if (!data?.proposalTemplate?.config) return null;
    const base = templateConfigToPreviewDocument(data.proposalTemplate.config);
    return {
      ...base,
      variables: mergePublicProposalVariables(base.variables, data),
    };
  }, [data]);

  const generationConsumptionChart = useMemo(
    () => buildGenerationConsumptionChartFromSimulation(data?.simulation),
    [data?.simulation]
  );

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </main>
    );
  }

  if (!data) return <LoadingState label="Carregando proposta" compact />;

  if (!documentState) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Proposta indisponível</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Esta proposta ainda não tem template vinculado.
        </p>
      </main>
    );
  }

  const publicColumnClass = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className={`bg-[var(--color-background)] py-4 ${publicColumnClass}`}>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{data.title}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Cliente: {data.deal.lead.name} · Válida até{" "}
          {new Date(data.validUntil).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className={`${publicColumnClass} pt-5 pb-8`}>
        <PreviewDocument
          title={data.title}
          documentState={documentState}
          mode="web"
          viewport="desktop"
          publicLayout
          sectionRenderOptions={
            generationConsumptionChart ? { generationConsumptionChart } : undefined
          }
        />
      </div>
    </main>
  );
}
