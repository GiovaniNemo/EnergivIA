import { FinancingSimulationDetailView } from "@/components/financing/financing-simulation-detail-view";

export default function FinanciamentoDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return <FinancingSimulationDetailView simulationId={params.id} />;
}
