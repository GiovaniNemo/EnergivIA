import { ProposalInternalView } from "@/components/proposals/proposal-internal-view";

export default function ProposalInternalPage({ params }: { params: { id: string } }): JSX.Element {
  return <ProposalInternalView proposalId={params.id} />;
}
