import { FinancingApplicationDetailView } from "@/components/financing/financing-application-detail-view";

export default function FinanciamentoAplicacaoDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return <FinancingApplicationDetailView applicationId={params.id} />;
}
