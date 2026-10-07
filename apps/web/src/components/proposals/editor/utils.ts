"use client";

import type { ProposalDocumentJson, SectionType, TemplatePreset } from "./types";
import {
  getSectionVariantOptions,
  SECTION_DEFAULT_FIELDS,
  SECTION_TYPE_LABELS,
  SECTION_TYPES,
} from "./section-fields";

export function replaceVariables(html: string, values: Record<string, string | number>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const resolved = values[key.trim()];
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

export function parseMoneyLike(value: unknown, fallback: number = NaN): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;

  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return fallback;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

export type BaseDocumentSectionSpec =
  | string
  | {
      type: SectionType;
      title?: string;
      variant?: string;
      content?: string;
      fields?: Record<string, unknown>;
    };

export function createBaseDocument(
  coverTitle: string,
  sectionSpecs: (string | BaseDocumentSectionSpec)[]
): ProposalDocumentJson {
  const sections = sectionSpecs.map((spec, index) => {
    let type: SectionType;
    let title: string;
    let variant: string | undefined;
    let customFields: Record<string, unknown> | undefined;
    let customContent: string | undefined;

    if (typeof spec === "object" && spec !== null && "type" in spec) {
      type = spec.type;
      title = spec.title ?? SECTION_TYPE_LABELS[type] ?? "Seção";
      variant = spec.variant;
      customFields = spec.fields;
      customContent = spec.content;
    } else {
      title = String(spec);
      type = inferSectionType(title, index);
    }

    const resolvedVariant =
      variant ??
      (type === "cover" ? "full-image" : (getSectionVariantOptions(type)[0]?.value ?? "default"));

    const defaultFields = SECTION_DEFAULT_FIELDS[type] ?? {};
    const mergedFields: Record<string, unknown> = {
      ...defaultFields,
      ...(customFields ?? {}),
    };

    if ("title" in defaultFields && !mergedFields.title) {
      mergedFields.title = title;
    }

    return {
      id: createId(),
      type,
      variant: resolvedVariant,
      title,
      hidden: false,
      content:
        customContent ??
        (index === 0
          ? "<p>Bem-vindo(a) a sua proposta.</p>"
          : type === "signature"
            ? "<p>Ao confirmar esta proposta comercial, as partes reconhecem a conformidade do dimensionamento técnico, valores e condições acordadas.</p>"
            : '<p>Caro(a) <span data-variable-token="nome_cliente">{{nome_cliente}}</span>, esta seção pode ser personalizada para sua narrativa comercial.</p>'),
      fields: mergedFields,
    };
  });

  return {
    sections,
    styles: {
      branding: {
        logoUrl: "",
        primaryColor: "#22C55E",
        secondaryColor: "#16A34A",
        backgroundColor: "#0B1220",
        textColor: "#E5E7EB",
      },
      typography: {
        fontFamily: "Inter",
        titleSize: 30,
        subtitleSize: 20,
        bodySize: 14,
        preset: "medium",
      },
      layout: {
        pageWidth: "medium",
        spacing: "normal",
        borderRadius: 16,
        shadowIntensity: 4,
      },
      cover: {
        imageUrl: "",
        overlayColor: "",
        overlayOpacity: 0,
        titleText: coverTitle,
        showLogo: true,
      },
      footer: {
        companyName: "Solar Energy Co.",
        contactInfo: "comercial@solarenergia.com | +55 44 0000-0000",
        showPageNumbers: true,
      },
    },
    variables: {
      nome_cliente: "João Silva",
      nome_empresa: "Solar Energia Co.",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
      tamanho_sistema_kw: "9.8 kWp",
      conta_mensal_energia: 650,
      taxa_reajuste_anual: "8",
      potencia_sistema_kwp: 8,
      geracao_mensal_kwh: 872,
      cobertura_consumo_pct: 80,
      equivalente_arvores_ano: 240,
      financiamento_meses_config: 96,
      financiamento_entrada_tipo: "fixo",
      financiamento_entrada_valor: 0,
    },
  };
}

export function inferSectionType(title: string, index?: number): SectionType {
  const raw = typeof title === "string" ? title : "";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (index === 0 || normalized.includes("cover") || normalized.includes("capa")) {
    return "cover";
  }

  // Exact type identifier match
  if (SECTION_TYPES.includes(raw as SectionType)) {
    return raw as SectionType;
  }

  // Exact match against official labels in SECTION_TYPE_LABELS
  for (const [key, label] of Object.entries(SECTION_TYPE_LABELS)) {
    const normLabel = label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (normalized === normLabel) {
      return key as SectionType;
    }
  }

  // Introduction
  if (
    normalized.includes("introduction") ||
    normalized.includes("introducao") ||
    normalized.includes("summary") ||
    normalized.includes("resumo") ||
    normalized.includes("carta") ||
    normalized.includes("boas-vindas") ||
    normalized.includes("boas vindas")
  ) {
    return "introduction";
  }

  // About Company
  if (
    normalized.includes("company") ||
    normalized.includes("empresa") ||
    normalized.includes("brand") ||
    normalized.includes("quem somos") ||
    normalized.includes("sobre nos") ||
    normalized.includes("historia da marca") ||
    normalized.includes("nossa historia")
  ) {
    return "about_company";
  }

  // Diagnostic
  if (
    normalized.includes("diagnostico") ||
    normalized.includes("diagnostic") ||
    normalized.includes("pain points") ||
    normalized.includes("cenario atual") ||
    normalized.includes("panorama da conta") ||
    normalized.includes("conta atual")
  ) {
    return "diagnostic_energy";
  }

  // Solution - handles "Solução", "Solução proposta", "Nossa Solução", "Arquitetura do Sistema", "Projeto do Sistema", etc.
  if (
    normalized.includes("solucao") ||
    normalized.includes("solution") ||
    normalized.includes("proposta de solucao") ||
    normalized.includes("arquitetura do sistema") ||
    normalized.includes("projeto do sistema") ||
    normalized.includes("sistema") ||
    normalized.includes("system")
  ) {
    return "solution";
  }

  // Generation & Consumption
  if (
    normalized.includes("geracao") ||
    normalized.includes("consumo") ||
    normalized.includes("generation") ||
    normalized.includes("consumption") ||
    normalized.includes("performance") ||
    normalized.includes("desempenho") ||
    normalized.includes("previsao de performance") ||
    normalized.includes("base de consumo")
  ) {
    return "generation_consumption";
  }

  // Proposal Equipment
  if (
    normalized.includes("equipamento") ||
    normalized.includes("equipment") ||
    normalized.includes("inversor") ||
    normalized.includes("modulo") ||
    normalized.includes("materiais") ||
    normalized.includes("componentes")
  ) {
    return "proposal_equipment";
  }

  // Gallery
  if (
    normalized.includes("galeria") ||
    normalized.includes("gallery") ||
    normalized.includes("fotos") ||
    normalized.includes("portfolio") ||
    normalized.includes("obras") ||
    normalized.includes("instalacoes")
  ) {
    return "gallery";
  }

  // Economy / Purchasing Power
  if (
    normalized.includes("poder de compra") ||
    normalized.includes("economia") ||
    normalized.includes("savings") ||
    normalized.includes("beneficio financeiro")
  ) {
    return "economy_purchases";
  }

  // Pricing / Investment
  if (
    normalized.includes("investimento") ||
    normalized.includes("investment") ||
    normalized.includes("pricing") ||
    normalized.includes("preco") ||
    normalized.includes("orcamento") ||
    normalized.includes("impacto financeiro") ||
    normalized.includes("valores")
  ) {
    return "pricing";
  }

  // Financing
  if (
    normalized.includes("financiamento") ||
    normalized.includes("financing") ||
    normalized.includes("parcelamento") ||
    normalized.includes("parcelas") ||
    normalized.includes("simulacao")
  ) {
    return "financing";
  }

  // Testimonials
  if (
    normalized.includes("depoimento") ||
    normalized.includes("testimonial") ||
    normalized.includes("clientes") ||
    normalized.includes("avaliacoes")
  ) {
    return "testimonials";
  }

  // Social Proof
  if (
    normalized.includes("prova social") ||
    normalized.includes("social proof") ||
    normalized.includes("numeros") ||
    normalized.includes("estatisticas") ||
    normalized.includes("metricas")
  ) {
    return "social_proof";
  }

  // Guarantees
  if (
    normalized.includes("garantia") ||
    normalized.includes("guarantee") ||
    normalized.includes("seguranca")
  ) {
    return "guarantees";
  }

  // Process Steps
  if (
    normalized.includes("etapa") ||
    normalized.includes("processo") ||
    normalized.includes("passo") ||
    normalized.includes("roteiro") ||
    normalized.includes("implementacao") ||
    normalized.includes("linha do tempo") ||
    normalized.includes("proximos passos")
  ) {
    return "process_steps";
  }

  // FAQ
  if (
    normalized.includes("faq") ||
    normalized.includes("pergunta") ||
    normalized.includes("duvida") ||
    normalized.includes("question")
  ) {
    return "faq";
  }

  // CTA
  if (
    normalized.includes("cta") ||
    normalized.includes("resposta") ||
    normalized.includes("decisao") ||
    normalized.includes("aceite") ||
    normalized.includes("acao")
  ) {
    return "cta";
  }

  // Signature
  if (
    normalized.includes("assinatura") ||
    normalized.includes("signature") ||
    normalized.includes("aprovacao") ||
    normalized.includes("approval") ||
    normalized.includes("contrato") ||
    normalized.includes("termo") ||
    normalized.includes("formalizacao")
  ) {
    return "signature";
  }

  // Comparison
  if (
    normalized.includes("comparacao") ||
    normalized.includes("comparativo") ||
    normalized.includes("comparison") ||
    normalized.includes("antes e depois") ||
    normalized.includes("versus") ||
    normalized.includes(" vs ") ||
    normalized.endsWith(" vs") ||
    normalized.startsWith("vs ")
  ) {
    return "comparison";
  }

  // Video
  if (normalized.includes("video") || normalized.includes("tour virtual")) {
    return "video";
  }

  return "custom";
}

export const BUILTIN_TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "residential",
    name: "Solar Residencial",
    description: "Estrutura equilibrada para clientes residenciais.",
    payload: createBaseDocument("Template de Proposta Solar Residencial", [
      "Capa",
      "Introdução",
      "Sobre a Empresa",
      "Solução",
      "Investimento",
      "Depoimentos",
      "Assinatura",
    ]),
  },
  {
    id: "commercial",
    name: "Solar Comercial",
    description: "Focado em objetivos de negócio, ROI e escala.",
    payload: createBaseDocument("Template de Proposta Solar Comercial", [
      "Capa",
      "Resumo Executivo",
      "Base de Consumo",
      "Arquitetura do Sistema",
      "Impacto Financeiro",
      "Roteiro de Implementação",
      "Aprovação",
    ]),
  },
  {
    id: "financing",
    name: "Proposta com Financiamento",
    description: "Inclui opções de financiamento e cenários mensais.",
    payload: createBaseDocument("Template de Proposta Solar com Financiamento", [
      "Capa",
      "Introdução",
      "Panorama da Conta Atual",
      "Opções de Financiamento",
      "Linha do Tempo de Pagamento",
      "Investimento",
      "Assinatura",
    ]),
  },
  {
    id: "premium",
    name: "Proposta Premium",
    description: "Estilo visual premium para posicionamento de alto valor.",
    payload: createBaseDocument("Template de Proposta Solar Premium", [
      "Capa",
      "Carta de Boas-vindas",
      "História da Marca",
      "Projeto do Sistema",
      "Previsão de Performance",
      "Investimento",
      "Próximos Passos",
    ]),
  },
];

export async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}
