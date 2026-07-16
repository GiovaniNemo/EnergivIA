import { PlatformApplicationDetailView } from "@/components/financing/platform-application-detail-view";

export default function PlataformaAplicacaoDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return <PlatformApplicationDetailView applicationId={params.id} />;
}
