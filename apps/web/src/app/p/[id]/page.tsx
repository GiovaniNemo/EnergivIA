import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProposalView } from "@/components/proposals/public-proposal-view";
import { LoadingState } from "@/components/ui/loading-state";
import { generateMetadata as baseGenerateMetadata } from "@/app/proposta/[id]/page";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return baseGenerateMetadata({ params });
}

export default function ShortPublicProposalPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return (
    <Suspense fallback={<LoadingState label="Carregando proposta" compact />}>
      <PublicProposalView proposalId={params.id} />
    </Suspense>
  );
}
