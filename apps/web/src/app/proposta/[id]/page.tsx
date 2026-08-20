import { Suspense } from "react";
import { PublicProposalView } from "@/components/proposals/public-proposal-view";
import { LoadingState } from "@/components/ui/loading-state";

export default function PublicProposalPage({ params }: { params: { id: string } }): JSX.Element {
  return (
    <Suspense fallback={<LoadingState label="Carregando proposta" compact />}>
      <PublicProposalView proposalId={params.id} />
    </Suspense>
  );
}
