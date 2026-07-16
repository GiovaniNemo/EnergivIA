import { ProposalTemplateEditor } from "@/components/proposals/proposal-template-editor";

interface TemplateEditorByIdPageProps {
  params: {
    id: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
}

function parseNewTemplateFlow(raw: string | string[] | undefined): "import" | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "modelo") return "import";
  return undefined;
}

export default function TemplateEditorByIdPage({
  params,
  searchParams,
}: TemplateEditorByIdPageProps): JSX.Element {
  const initialNewTemplateFlow = parseNewTemplateFlow(searchParams?.["novo"]);
  return (
    <ProposalTemplateEditor
      templateId={params.id}
      initialNewTemplateFlow={initialNewTemplateFlow}
    />
  );
}
