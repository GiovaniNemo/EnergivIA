export type TemplateAssistantRole = "OWNER" | "ADMIN" | "ENGINEER" | "SALES" | "VIEWER";

export type TemplateAssistantCapability =
  | "section.generate"
  | "section.refine"
  | "section.variant.suggest"
  | "section.add"
  | "section.reorder"
  | "section.remove"
  | "asset.search"
  | "asset.ingest"
  | "template.validate"
  | "template.publish.assist";

export const TEMPLATE_ASSISTANT_CAPABILITIES: readonly TemplateAssistantCapability[] = [
  "section.generate",
  "section.refine",
  "section.variant.suggest",
  "section.add",
  "section.reorder",
  "section.remove",
  "asset.search",
  "asset.ingest",
  "template.validate",
  "template.publish.assist",
] as const;

export const TEMPLATE_ASSISTANT_CAPABILITY_MATRIX: Record<
  TemplateAssistantRole,
  readonly TemplateAssistantCapability[]
> = {
  OWNER: TEMPLATE_ASSISTANT_CAPABILITIES,
  ADMIN: TEMPLATE_ASSISTANT_CAPABILITIES,
  ENGINEER: [
    "section.generate",
    "section.refine",
    "section.variant.suggest",
    "section.add",
    "section.reorder",
    "section.remove",
    "asset.search",
    "asset.ingest",
    "template.validate",
  ],
  SALES: [
    "section.generate",
    "section.refine",
    "section.variant.suggest",
    "section.add",
    "section.reorder",
    "asset.search",
    "asset.ingest",
    "template.validate",
  ],
  VIEWER: ["template.validate"],
};

export type TemplateAssistantOperation =
  | {
      kind: "update_section";
      sectionId: string;
      title?: string;
      content?: string;
      fieldsPatch?: Record<string, unknown>;
    }
  | {
      kind: "add_section";
      sectionType: string;
      title?: string;
      content?: string;
      fieldsPatch?: Record<string, unknown>;
    }
  | {
      kind: "remove_section";
      sectionId: string;
    }
  | {
      kind: "reorder_section";
      sectionId: string;
      toIndex: number;
    }
  | {
      kind: "set_section_visibility";
      sectionId: string;
      hidden: boolean;
    }
  | {
      kind: "update_template_title";
      title: string;
    }
  | {
      kind: "no_op";
      reason: string;
    };

export interface TemplateAssistantSuggestion {
  id: string;
  title: string;
  summary: string;
  presentation?: {
    html?: string;
  };
  operations: TemplateAssistantOperation[];
}

export interface TemplateAssistantToolCall {
  tool: string;
  capability: TemplateAssistantCapability;
  status: "success" | "denied" | "error";
  message?: string;
}

export interface TemplateAssistantValidationIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  sectionId?: string;
}

export interface TemplateAssistantChatRequest {
  message: string;
  selectedSectionId?: string;
  conversation?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  document: {
    title: string;
    sections: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      hidden?: boolean;
      fields?: Record<string, unknown>;
    }>;
    variables?: Record<string, string | number>;
  };
}

export interface TemplateAssistantChatResponse {
  traceId: string;
  assistantMessage: string;
  suggestions: TemplateAssistantSuggestion[];
  validations: TemplateAssistantValidationIssue[];
  toolCalls: TemplateAssistantToolCall[];
}
