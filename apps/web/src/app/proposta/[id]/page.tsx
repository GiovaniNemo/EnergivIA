import { PublicProposalView } from "@/components/proposals/public-proposal-view";

export default function PublicProposalPage({ params }: { params: { id: string } }): JSX.Element {
  return <PublicProposalView proposalId={params.id} />;
}
