"use client";

import { useParams } from "next/navigation";
import { ProposalTemplateEditor } from "@/components/proposals/proposal-template-editor";

export default function EditTemplateModelPage(): JSX.Element {
  const params = useParams();
  const id = params["id"] as string | undefined;
  if (!id) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Modelo inválido.</p>;
  }
  return <ProposalTemplateEditor variant="blueprint" templateBlueprintId={id} />;
}
