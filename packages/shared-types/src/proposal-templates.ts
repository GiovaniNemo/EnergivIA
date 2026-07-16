export const PROPOSAL_TEMPLATE_SECTION_KEYS = [
  "cover",
  "introduction",
  "about_company",
  "diagnostic_energy",
  "solution",
  "generation_consumption",
  "proposal_equipment",
  "gallery",
  "economy_purchases",
  "pricing",
  "financing",
  "testimonials",
  "social_proof",
  "guarantees",
  "process_steps",
  "faq",
  "cta",
  "signature",
  "comparison",
  "video",
  "custom",
] as const;

export type ProposalTemplateSectionKey = (typeof PROPOSAL_TEMPLATE_SECTION_KEYS)[number];

export interface ProposalTemplateTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  coverImageUrl?: string;
  companyDescription: string;
}

export interface ProposalTemplateSection {
  key: ProposalTemplateSectionKey;
  enabled: boolean;
  position: number;
  title: string;
  content?: string;
}

export interface ProposalEditorSection {
  id: string;
  type: ProposalTemplateSectionKey;
  variant: string;
  order: number;
  title: string;
  content: Record<string, unknown>;
  style?: Record<string, unknown>;
  visible: boolean;
}

export interface ProposalEditorDocument {
  sections: ProposalEditorSection[];
  styles: Record<string, unknown>;
  variables: Record<string, string>;
}

export interface ProposalTemplateConfig {
  theme: ProposalTemplateTheme;
  sections: ProposalTemplateSection[];
  editor?: ProposalEditorDocument;
}

export interface ProposalTemplatePreviewData {
  client_name: string;
  company_name: string;
  proposal_date: string;
  system_power_kwp: string;
  estimated_yearly_production: string;
  equipment_list: string;
  monthly_savings: string;
  payback_years: string;
  warranty_text: string;
  next_steps_text: string;
}

export const DEFAULT_PROPOSAL_TEMPLATE_CONFIG: ProposalTemplateConfig = {
  theme: {
    primaryColor: "#0f172a",
    secondaryColor: "#22c55e",
    companyDescription:
      "Projetamos sistemas solares de alta performance com engenharia especializada e instalacao certificada.",
  },
  sections: [
    { key: "cover", enabled: true, position: 1, title: "Capa" },
    { key: "introduction", enabled: true, position: 2, title: "Introducao" },
    { key: "about_company", enabled: true, position: 3, title: "Sobre a Empresa" },
    { key: "diagnostic_energy", enabled: true, position: 4, title: "Diagnostico Energetico" },
    { key: "solution", enabled: true, position: 5, title: "Nossa Solucao" },
    {
      key: "generation_consumption",
      enabled: false,
      position: 6,
      title: "Dados de Geracao e Consumo",
    },
    {
      key: "proposal_equipment",
      enabled: false,
      position: 7,
      title: "Equipamentos da proposta",
    },
    { key: "gallery", enabled: true, position: 8, title: "Galeria" },
    { key: "economy_purchases", enabled: true, position: 9, title: "Economia — poder de compra" },
    { key: "pricing", enabled: true, position: 10, title: "Investimento" },
    { key: "financing", enabled: true, position: 11, title: "Financiamento" },
    { key: "testimonials", enabled: true, position: 12, title: "Depoimentos" },
    { key: "social_proof", enabled: true, position: 13, title: "Prova Social" },
    {
      key: "guarantees",
      enabled: true,
      position: 14,
      title: "Garantias",
      content:
        "Equipamentos com garantia de fabrica e performance, incluindo cobertura para inversor e modulos.",
    },
    {
      key: "process_steps",
      enabled: true,
      position: 15,
      title: "Proximos Passos",
      content:
        "1) Aprovacao da proposta. 2) Agendamento da vistoria tecnica. 3) Inicio da instalacao.",
    },
    { key: "faq", enabled: true, position: 16, title: "Perguntas Frequentes" },
    { key: "cta", enabled: true, position: 17, title: "Chamada para Acao" },
    { key: "signature", enabled: true, position: 18, title: "Assinatura" },
    { key: "comparison", enabled: true, position: 19, title: "Comparativo" },
    { key: "video", enabled: true, position: 20, title: "Video" },
    { key: "custom", enabled: false, position: 21, title: "Bloco Customizado" },
  ],
};

export const DEFAULT_PROPOSAL_PREVIEW_DATA: ProposalTemplatePreviewData = {
  client_name: "Ana Souza",
  company_name: "Solar Prime Energia",
  proposal_date: "09/03/2026",
  system_power_kwp: "8.40",
  estimated_yearly_production: "11.760",
  equipment_list: "14x Modulos 600W, 1x Inversor 8kW, Estrutura, Cabos e Conectores",
  monthly_savings: "R$ 612,00",
  payback_years: "3,8 anos",
  warranty_text:
    "Modulos com garantia de performance de 25 anos e inversor com garantia de 10 anos.",
  next_steps_text:
    "Aprovacao da proposta, assinatura digital do contrato e agendamento da instalacao em ate 15 dias.",
};

export function resolveTemplateVariables(
  template: string,
  data: Partial<ProposalTemplatePreviewData>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const value = data[key.trim() as keyof ProposalTemplatePreviewData];
    return typeof value === "string" ? value : "";
  });
}
