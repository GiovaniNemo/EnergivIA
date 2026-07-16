"use client";

import type { ProposalDocumentJson, SectionType, TemplatePreset } from "./types";
import { getSectionVariantOptions, SECTION_DEFAULT_FIELDS } from "./section-fields";

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

export function createBaseDocument(
  coverTitle: string,
  sectionTitles: string[]
): ProposalDocumentJson {
  const sections = sectionTitles.map((title, index) => {
    const type = inferSectionType(title, index);
    const variant =
      type === "cover" ? "full-image" : (getSectionVariantOptions(type)[0]?.value ?? "default");
    return {
      id: createId(),
      type,
      variant,
      title,
      hidden: false,
      content:
        index === 0
          ? "<p>Bem-vindo(a) a sua proposta.</p>"
          : '<p>Caro(a) <span data-variable-token="nome_cliente">{{nome_cliente}}</span>, esta seção pode ser personalizada para sua narrativa comercial.</p>',
      fields: { ...SECTION_DEFAULT_FIELDS[type] },
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

function inferSectionType(title: string, index: number): SectionType {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (index === 0 || normalized.includes("cover") || normalized.includes("capa")) return "cover";
  if (
    normalized.includes("introduction") ||
    normalized.includes("introducao") ||
    normalized.includes("summary") ||
    normalized.includes("resumo")
  )
    return "introduction";
  if (
    normalized.includes("company") ||
    normalized.includes("empresa") ||
    normalized.includes("brand")
  )
    return "about_company";
  if (
    normalized.includes("equipamento") &&
    (normalized.includes("proposta") ||
      normalized.includes("projeto") ||
      normalized.includes("sistema"))
  ) {
    return "proposal_equipment";
  }
  if (
    normalized.includes("geracao") ||
    normalized.includes("geração") ||
    normalized.includes("consumo") ||
    normalized.includes("generation") ||
    normalized.includes("performance")
  ) {
    return "generation_consumption";
  }
  if (normalized.includes("system") || normalized.includes("sistema")) return "solution";
  if (
    normalized.includes("investment") ||
    normalized.includes("pricing") ||
    normalized.includes("investimento")
  )
    return "pricing";
  if (normalized.includes("financing") || normalized.includes("financiamento")) return "financing";
  if (normalized.includes("testimonial") || normalized.includes("depoimento"))
    return "testimonials";
  if (
    normalized.includes("signature") ||
    normalized.includes("approval") ||
    normalized.includes("assinatura") ||
    normalized.includes("aprovacao")
  )
    return "signature";
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
      "Sobre Nossa Empresa",
      "Solução proposta",
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
