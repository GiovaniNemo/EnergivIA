"use client";

import type { ProposalBuilderDocument, ProposalBuilderSection, SectionType } from "./types";
import { SECTION_DEFINITIONS } from "./section-definitions";
import type { ProposalTemplateConfig, ProposalTemplateSectionKey } from "@energivia/shared-types";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSection(type: SectionType, order: number): ProposalBuilderSection {
  const def = SECTION_DEFINITIONS[type];
  return {
    id: createId(),
    type,
    order,
    title: def.label,
    variant: def.defaultVariant,
    visible: true,
    content: { ...def.defaults },
    style: {},
  };
}

export function createTemplate(
  type: "residential" | "commercial" | "financing"
): ProposalBuilderDocument {
  const base: ProposalBuilderDocument = {
    sections: [],
    variables: {
      nome_cliente: "Ana Souza",
      nome_empresa: "Solar Prime",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
    },
  };

  const map: Record<typeof type, SectionType[]> = {
    residential: [
      "cover",
      "introduction",
      "diagnostic_energy",
      "solution",
      "economy_purchases",
      "pricing",
      "faq",
      "cta",
      "signature",
    ],
    commercial: [
      "cover",
      "introduction",
      "about_company",
      "diagnostic_energy",
      "solution",
      "comparison",
      "economy_purchases",
      "financing",
      "testimonials",
      "cta",
    ],
    financing: [
      "cover",
      "introduction",
      "economy_purchases",
      "pricing",
      "financing",
      "comparison",
      "faq",
      "cta",
      "signature",
    ],
  };

  base.sections = map[type].map((sectionType, idx) => createSection(sectionType, idx));
  return base;
}

export function toTemplateConfig(document: ProposalBuilderDocument): ProposalTemplateConfig {
  const toTemplateSectionKey = (type: SectionType): ProposalTemplateSectionKey => {
    return type;
  };

  return {
    theme: {
      primaryColor: "#0f172a",
      secondaryColor: "#22c55e",
      companyDescription: "Config-driven modular solar proposal builder.",
    },
    sections: document.sections.map((section, idx) => ({
      key: toTemplateSectionKey(section.type),
      enabled: section.visible,
      position: idx + 1,
      title: section.title,
    })),
    editor: {
      sections: document.sections.map((section, idx) => ({
        ...section,
        type: toTemplateSectionKey(section.type),
        order: idx,
      })),
      styles: {},
      variables: document.variables,
    },
  };
}

export function fromTemplateConfig(config: ProposalTemplateConfig): ProposalBuilderDocument | null {
  if (!config.editor?.sections?.length) return null;
  return {
    sections: config.editor.sections.map((section, idx) => ({
      id: section.id,
      type: section.type,
      variant: section.variant,
      order: typeof section.order === "number" ? section.order : idx,
      visible: section.visible !== false,
      title: section.title,
      content: section.content ?? {},
      style: section.style ?? {},
    })),
    variables: config.editor.variables ?? {},
  };
}

export async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
