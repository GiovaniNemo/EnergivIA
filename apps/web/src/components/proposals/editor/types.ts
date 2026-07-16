"use client";

export type VariableToken =
  | "nome_cliente"
  | "nome_empresa"
  | "data_proposta"
  | "tamanho_sistema_kw"
  | "potencia_sistema_kwp"
  | "geracao_mensal_kwh"
  | "cobertura_consumo_pct"
  | "equivalente_arvores_ano";
export type SettingsTab = "branding" | "typography" | "layout" | "footer";
export type PageWidth = "narrow" | "medium" | "wide";
export type Spacing = "compact" | "normal" | "relaxed";
export type FontFamily = "Inter" | "Roboto" | "Open Sans" | "Montserrat";
export type TypographyPreset = "small" | "medium" | "large";
export type SectionType =
  | "cover"
  | "introduction"
  | "about_company"
  | "diagnostic_energy"
  | "solution"
  | "generation_consumption"
  | "proposal_equipment"
  | "gallery"
  | "economy_purchases"
  | "pricing"
  | "financing"
  | "testimonials"
  | "social_proof"
  | "guarantees"
  | "process_steps"
  | "faq"
  | "cta"
  | "signature"
  | "comparison"
  | "video"
  | "custom";

export interface ProposalSection {
  id: string;
  type: SectionType;
  variant: string;
  title: string;
  content: string;
  fields: Record<string, unknown>;
  hidden?: boolean;
}

export interface ProposalStyles {
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  typography: {
    fontFamily: FontFamily;
    titleSize: number;
    subtitleSize: number;
    bodySize: number;
    preset: TypographyPreset;
  };
  layout: {
    pageWidth: PageWidth;
    spacing: Spacing;
    borderRadius: number;
    shadowIntensity: number;
  };
  cover: {
    imageUrl: string;
    overlayColor: string;
    overlayOpacity: number;
    titleText: string;
    showLogo: boolean;
  };
  footer: {
    companyName: string;
    contactInfo: string;
    showPageNumbers: boolean;
  };
}

export interface ProposalDocumentJson {
  sections: ProposalSection[];
  styles: ProposalStyles;
  variables: Record<string, string | number>;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  payload: ProposalDocumentJson;
  thumbnailUrl?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  payload: ProposalDocumentJson;
  thumbnailUrl?: string;
}

export const VARIABLE_LABELS: Record<VariableToken, string> = {
  nome_cliente: "Nome do Cliente",
  nome_empresa: "Nome da Empresa",
  data_proposta: "Data da Proposta",
  tamanho_sistema_kw: "Tamanho do Sistema (kW)",
  potencia_sistema_kwp: "Potência do sistema (kWp)",
  geracao_mensal_kwh: "Geração estimada (kWh/mês)",
  cobertura_consumo_pct: "Cobertura do consumo (%)",
  equivalente_arvores_ano: "Equivalente ambiental (árvores/ano)",
};
