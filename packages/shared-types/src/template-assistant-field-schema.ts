export type TemplateAssistantFieldValueType = "string" | "boolean" | "enum" | "url" | "number";

export interface TemplateAssistantFieldDefinition {
  name: string;
  valueType: TemplateAssistantFieldValueType;
  editableByAi: boolean;
  allowedValues?: string[];
  aliases?: string[];
  invertBooleanAliases?: string[];
}

export type TemplateAssistantSectionFieldSchema = Record<
  string,
  TemplateAssistantFieldDefinition[]
>;

const COMMON_TEXT_FIELDS: TemplateAssistantFieldDefinition[] = [
  { name: "title", valueType: "string", editableByAi: true },
  { name: "text", valueType: "string", editableByAi: true, aliases: ["description", "content"] },
];

export const TEMPLATE_ASSISTANT_FIELD_SCHEMA: TemplateAssistantSectionFieldSchema = {
  cover: [
    { name: "title", valueType: "string", editableByAi: true, aliases: ["coverTitle"] },
    { name: "subtitle", valueType: "string", editableByAi: true, aliases: ["subTitle"] },
    {
      name: "highlight",
      valueType: "string",
      editableByAi: true,
      aliases: ["tagline", "badgeText"],
    },
    {
      name: "logoPlacement",
      valueType: "enum",
      editableByAi: true,
      allowedValues: ["header", "content"],
      aliases: ["logo_position", "logoPosition"],
    },
    {
      name: "companyNamePlacement",
      valueType: "enum",
      editableByAi: true,
      allowedValues: ["header", "content"],
      aliases: ["company_name_placement", "companyPlacement"],
    },
    {
      name: "alignment",
      valueType: "enum",
      editableByAi: true,
      allowedValues: ["left", "center"],
      aliases: ["textAlignment", "text_alignment"],
    },
    {
      name: "showLogo",
      valueType: "boolean",
      editableByAi: true,
      aliases: ["logoVisible"],
      invertBooleanAliases: ["removeLogo", "hideLogo"],
    },
    {
      name: "logoSize",
      valueType: "number",
      editableByAi: true,
      aliases: ["logo_scale", "logoScale", "tamanhoLogo"],
    },
    {
      name: "showCompanyName",
      valueType: "boolean",
      editableByAi: true,
      aliases: ["companyNameVisible"],
      invertBooleanAliases: ["hideCompanyName", "removeCompanyName"],
    },
    { name: "backgroundImage", valueType: "url", editableByAi: true },
    { name: "overlayOpacity", valueType: "number", editableByAi: true },
    { name: "overlayColor", valueType: "string", editableByAi: true },
    { name: "textColor", valueType: "string", editableByAi: true },
  ],
  introduction: [...COMMON_TEXT_FIELDS],
  about_company: [...COMMON_TEXT_FIELDS, { name: "image", valueType: "url", editableByAi: true }],
  diagnostic_energy: [
    ...COMMON_TEXT_FIELDS,
    { name: "painPoints", valueType: "string", editableByAi: true, aliases: ["pain_points"] },
    { name: "impact", valueType: "string", editableByAi: true, aliases: ["financialImpact"] },
    {
      name: "highlightText",
      valueType: "string",
      editableByAi: true,
      aliases: ["highlight", "destaque", "fraseDestaque"],
    },
    {
      name: "highlightIcon",
      valueType: "enum",
      editableByAi: true,
      allowedValues: [
        "trending-up",
        "plug",
        "alert-circle",
        "dollar-sign",
        "zap",
        "battery",
        "wallet",
        "badge-alert",
        "line-chart",
        "shield-alert",
      ],
      aliases: ["iconeDestaque", "destaqueIcone", "destaque_icon"],
    },
    { name: "painIconColor", valueType: "string", editableByAi: true },
    { name: "impactIconColor", valueType: "string", editableByAi: true },
    { name: "highlightIconColor", valueType: "string", editableByAi: true },
  ],
  solution: [
    ...COMMON_TEXT_FIELDS,
    { name: "solutionName", valueType: "string", editableByAi: true },
    { name: "benefits", valueType: "string", editableByAi: true },
    { name: "howItWorks", valueType: "string", editableByAi: true },
  ],
  cta: [
    ...COMMON_TEXT_FIELDS,
    { name: "buttonUrl", valueType: "url", editableByAi: true, aliases: ["url"] },
    { name: "showAccept", valueType: "boolean", editableByAi: true },
    { name: "showReview", valueType: "boolean", editableByAi: true },
    { name: "showReject", valueType: "boolean", editableByAi: true },
  ],
  signature: [
    ...COMMON_TEXT_FIELDS,
    { name: "signatureName", valueType: "string", editableByAi: true },
  ],
  video: [...COMMON_TEXT_FIELDS, { name: "videoUrl", valueType: "url", editableByAi: true }],
};
