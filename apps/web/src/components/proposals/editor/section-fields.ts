"use client";

import type { SectionType } from "./types";
import {
  COVER_APPEARANCE_FIELD_CONFIG,
  COVER_FIELD_CONFIG,
  COVER_VARIANT_OPTIONS,
} from "@/components/sections/Cover/Cover.config";
import {
  DEFAULT_CONSUMO_SERIES,
  DEFAULT_GENERATION_MESES,
  DEFAULT_PRODUCAO_SERIES,
} from "@/components/proposals/sections/system-performance/parse-generation-fields";
export type SectionCategory = "Essenciais" | "Financeiro" | "Visual" | "Confiança" | "Avançado";

export type DynamicFieldType =
  | "text"
  | "number"
  | "range"
  | "toggle"
  | "color"
  | "image"
  | "list"
  | "table"
  | "proposal_equipment_lines"
  | "select"
  | "url";

export interface DynamicField {
  name: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  editorMode?: "plain" | "compactRichText" | "richText";
  selectDisplay?: "segmented" | "dropdown" | "grid";
  options?: { label: string; value: string; icon?: string }[];
  columns?: string[];
  min?: number;
  max?: number;
  step?: number;
  numberMode?: "int" | "decimal";
  unit?: string;
  helperText?: string;
  group?: string;
  visibleWhen?: {
    field: string;
    equals?: unknown;
    notEquals?: unknown;
    equalsAny?: unknown[];
  };
  allowOverride?: boolean;
  overrideToggleName?: string;
  defaultSourceLabel?: string;
  aiFieldPurpose?: string;
  multiline?: boolean;
  tableIncludeRowId?: boolean;
  minRows?: number;
  maxRows?: number;
  defaultNewRowIcon?: string;
  tableMultilineColumns?: string[];
  tableAddRowLabel?: string;
}

export interface SectionVariantOption {
  value: string;
  label: string;
  icon?: string;
  aliases?: string[];
  onSelectSetFields?: Record<string, unknown>;
}

const COMMON_SECTION_BASE_FIELDS: DynamicField[] = [
  {
    name: "title",
    label: "Título",
    type: "text",
    group: "Conteúdo",
    editorMode: "compactRichText",
    aiFieldPurpose:
      "Título desta seção da proposta: curto, claro e impactante. Pode usar variáveis como {{nome_cliente}}.",
  },
  {
    name: "text",
    label: "Descrição",
    type: "text",
    group: "Conteúdo",
    editorMode: "richText",
    aiFieldPurpose:
      "Texto principal da seção (HTML permitido). Tom profissional, foco em valor para proposta de energia solar; pode incluir variáveis.",
  },
  ...COVER_APPEARANCE_FIELD_CONFIG,
];

const SECTION_AI_CONTEXT_BY_TYPE: Partial<Record<SectionType, string>> = {
  cover:
    "Capa visual: headline em fields.title (texto plano); subtítulo em fields.subtitle em HTML (ex.: <p> com ênfase opcional); selo em fields.highlight só em texto plano. A imagem de fundo costuma ser aplicada depois pelo fluxo de onboarding.",
  introduction:
    'Abertura do projeto e deste documento: o que foi feito ou considerado no estudo, objetivo da proposta e como as seções seguem. Não duplicar texto institucional de "Sobre a empresa" (missão, história, quem somos).',
  about_company:
    "Institucional: empresa, equipe, experiência e diferenciais. Não repetir a introdução (escopo do projeto, estrutura do documento).",
  solution:
    "Apresenta a solução proposta para o cliente, com foco em benefícios práticos e clareza de valor.",
  diagnostic_energy:
    "Mostra dores e impactos do cenário atual de energia do cliente, criando urgência para mudança.",
  generation_consumption:
    "Explica dados de geração e consumo energético de forma didática, conectando números com entendimento do cliente.",
  proposal_equipment:
    "Lista e contextualiza os equipamentos do projeto, destacando adequação ao cenário do cliente.",
  gallery: "Seção visual para demonstrar provas do trabalho (instalações, resultados, equipe).",
  economy_purchases:
    "Traduz economia projetada em poder de compra para facilitar percepção de benefício financeiro.",
  pricing: "Detalha investimento e condições comerciais com transparência e objetividade.",
  financing: "Explica alternativas de financiamento e viabilidade de pagamento da solução.",
  testimonials:
    "Seção de prova social por depoimentos. O título e a descrição servem só para introduzir a seção; os depoimentos em si (textos, nomes, fotos) são configurados no componente de itens abaixo. Na descrição, não inventar citações, histórias de clientes nem lista de depoimentos.",
  social_proof: "Reforça credibilidade com indicadores, números e evidências de mercado.",
  guarantees: "Apresenta garantias e segurança da contratação para diminuir risco percebido.",
  process_steps:
    "Texto de contexto da seção de etapas. Não listar, definir ou detalhar etapas na descrição, pois as etapas são configuradas no componente específico de itens.",
  faq: "Responde dúvidas comuns para acelerar tomada de decisão.",
  cta: "Conduz o cliente para a próxima ação na proposta (aceitar, solicitar ajuste ou recusar).",
  signature: "Formaliza fechamento e aceite da proposta.",
  comparison: "Compara cenário antes e depois da solução para evidenciar ganho.",
  video: "Complementa a proposta com conteúdo em vídeo para reforçar entendimento e confiança.",
  custom: "Seção personalizada cujo conteúdo deve se alinhar ao objetivo definido no template.",
};

export function getSectionAiContext(sectionType: SectionType): string {
  return SECTION_AI_CONTEXT_BY_TYPE[sectionType] ?? "";
}

export const SECTION_TYPES_OWN_TITLE = new Set<SectionType>([
  "about_company",
  "introduction",
  "gallery",
  "video",
  "economy_purchases",
  "faq",
]);

export const SECTION_TYPES_NO_ALIGNMENT = new Set<SectionType>(["introduction", "about_company"]);

export const SECTION_TYPES: SectionType[] = [
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
];

export const SECTION_CATEGORY_ORDER: SectionCategory[] = [
  "Essenciais",
  "Financeiro",
  "Visual",
  "Confiança",
  "Avançado",
];

export const SECTION_CATEGORY_BY_TYPE: Record<SectionType, SectionCategory> = {
  cover: "Essenciais",
  introduction: "Essenciais",
  about_company: "Essenciais",
  diagnostic_energy: "Financeiro",
  solution: "Essenciais",
  generation_consumption: "Essenciais",
  proposal_equipment: "Essenciais",
  gallery: "Visual",
  economy_purchases: "Financeiro",
  pricing: "Financeiro",
  financing: "Financeiro",
  testimonials: "Confiança",
  social_proof: "Confiança",
  guarantees: "Confiança",
  process_steps: "Essenciais",
  faq: "Confiança",
  cta: "Essenciais",
  signature: "Avançado",
  comparison: "Financeiro",
  video: "Visual",
  custom: "Avançado",
};

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  cover: "Capa",
  introduction: "Introdução",
  about_company: "Sobre a Empresa",
  diagnostic_energy: "Diagnóstico Energético",
  solution: "Solução",
  generation_consumption: "Dados de Geração e Consumo",
  proposal_equipment: "Equipamentos da proposta",
  gallery: "Galeria",
  economy_purchases: "Poder de compra",
  pricing: "Investimento",
  financing: "Financiamento",
  testimonials: "Depoimentos",
  social_proof: "Prova Social",
  guarantees: "Garantias",
  process_steps: "Etapas do Processo",
  faq: "Perguntas Frequentes",
  cta: "Resposta à proposta",
  signature: "Assinatura",
  comparison: "Comparação",
  video: "Vídeo",
  custom: "Customizado",
};

export const SECTION_VARIANTS: Record<SectionType, string[]> = {
  cover: [...COVER_VARIANT_OPTIONS],
  introduction: ["carta", "hero", "split-name", "centered", "editorial-stripe"],
  about_company: ["hero", "editorial-split", "process-steps", "split-proof", "manifesto"],
  diagnostic_energy: ["topics", "list", "cards"],
  solution: ["topics", "cards"],
  generation_consumption: ["default", "modern", "modern_dashboard"],
  proposal_equipment: ["cards", "table", "list"],
  gallery: ["grid_uniform", "masonry", "mosaic_hero", "editorial", "overlay"],
  economy_purchases: ["vertical_stack", "split", "inverted", "narrative"],
  pricing: ["table", "compact"],
  financing: ["default", "split"],
  testimonials: ["overlap", "quote_header"],
  social_proof: ["stats", "logos"],
  guarantees: ["cards", "simple"],
  process_steps: ["vertical", "horizontal", "cards"],
  faq: ["list", "two_column", "interview", "headline"],
  cta: ["primary", "secondary"],
  signature: ["default", "digital"],
  comparison: ["default", "highlight"],
  video: ["hero", "split", "cinematic", "dark", "editorial"],
  custom: ["default"],
};

export const VARIANT_LABELS: Record<string, string> = {
  default: "Padrão",
  "full-image": "Imagem completa",
  split: "Dividido",
  minimal: "Minimalista",
  "card-overlay": "Card sobre imagem",
  "hero-cinematic": "Hero cinematográfico",
  "editorial-poster": "Poster editorial",
  "split-editorial": "Split editorial",
  "glass-card": "Card glass",
  "data-hero": "Dados como herói",
  story: "Narrativo",
  highlight: "Destaque",
  "image-background-overlay": "Imagem de fundo + overlay",
  "image-focus": "Imagem em destaque",
  "image-top": "Imagem no topo",
  hero: "Hero imersivo",
  "editorial-split": "Editorial dividido",
  "process-steps": "Grade editorial",
  "split-proof": "Split com prova social",
  manifesto: "Manifesto",
  bullets: "Tópicos",
  topics: "Tópicos",
  list: "Lista",
  table: "Tabela",
  cards: "Cartões",
  grid: "Grade",
  slider: "Carrossel",
  before_after: "Antes/Depois",
  simple: "Simples",
  chart: "Gráfico",
  comparison: "Comparação",
  compact: "Compacto",
  carousel: "Carrossel",
  stats: "Estatísticas",
  logos: "Logos",
  timeline: "Linha do tempo",
  accordion: "Acordeão",
  primary: "Primário",
  secondary: "Secundário",
  digital: "Digital",
  embed: "Embed",
  inline: "Inline",
  modern: "Moderno",
  modern_dashboard: "Moderno — painel (kWp + métricas)",
  overlap: "Avatar sobreposto",
  quote_header: "Cabeçalho com aspas",
  vertical: "Linha do tempo (vertical)",
  horizontal: "Stepper horizontal",
  carta: "Carta editorial",
  "split-name": "Split com nome",
  centered: "Manifesto centrado",
  "editorial-stripe": "Editorial com faixa",
  grid_uniform: "Grade uniforme",
  masonry: "Masonry",
  mosaic_hero: "Mosaico com destaque",
  editorial: "Editorial alternado",
  overlay: "Grade com legenda",
  cinematic: "Cinemático com card",
  dark: "Featured fundo escuro",
  vertical_stack: "Empilhado vertical",
  inverted: "Hierarquia invertida",
  narrative: "Narrativa inline",
  two_column: "Grade duas colunas",
  interview: "Editorial entrevista",
  headline: "Pergunta em destaque",
};

export const VARIANT_DISPLAY_ICONS: Record<string, string> = {
  default: "layout-template",
  "full-image": "image",
  split: "columns-2",
  minimal: "minus",
  "card-overlay": "layers",
  "hero-cinematic": "clapperboard",
  "editorial-poster": "newspaper",
  "split-editorial": "layout-panel-left",
  "glass-card": "layers",
  "data-hero": "bar-chart-big",
  story: "book-open",
  highlight: "sparkles",
  "image-background-overlay": "image-plus",
  "image-focus": "scan-search",
  "image-top": "panel-top",
  hero: "layout-panel-left",
  "editorial-split": "columns-2",
  "process-steps": "arrow-right-circle",
  "split-proof": "badge-check",
  manifesto: "quote",
  bullets: "list",
  topics: "list",
  list: "list-ordered",
  table: "table-2",
  cards: "layout-grid",
  grid: "layout-grid",
  slider: "images",
  before_after: "split",
  simple: "circle-dot",
  chart: "chart-column",
  comparison: "scale",
  compact: "shrink",
  carousel: "images",
  stats: "chart-bar",
  logos: "building-2",
  timeline: "history",
  accordion: "list-collapse",
  primary: "circle-dot",
  secondary: "circle",
  digital: "pen-line",
  embed: "video",
  inline: "square-code",
  modern: "sparkles",
  modern_dashboard: "layout-dashboard",
  overlap: "circle-user",
  quote_header: "quote",
  vertical: "git-branch",
  horizontal: "arrow-right",
  carta: "file-text",
  "split-name": "columns-2",
  centered: "align-center",
  "editorial-stripe": "panel-left",
  grid_uniform: "layout-grid",
  masonry: "gallery-vertical",
  mosaic_hero: "layout-dashboard",
  editorial: "newspaper",
  overlay: "image",
  cinematic: "clapperboard",
  dark: "moon",
  vertical_stack: "layout-list",
  inverted: "layout-template",
  narrative: "quote",
  two_column: "columns-2",
  interview: "newspaper",
  headline: "type",
};

const SECTION_VARIANT_BEHAVIOR: Record<
  SectionType,
  Record<string, Omit<SectionVariantOption, "value" | "label">>
> = {
  cover: {
    "full-image": { aliases: ["default"] },
    minimal: {},
  },
  introduction: {
    carta: { aliases: ["default"] },
    "editorial-stripe": { aliases: ["story"] },
  },
  about_company: {
    hero: { aliases: ["default"] },
    "split-proof": {
      aliases: ["image-background-overlay", "split-card", "highlight", "image-focus"],
    },
    manifesto: { aliases: ["image-top"] },
  },
  diagnostic_energy: {},
  solution: {},
  generation_consumption: { modern: { aliases: ["modern_split"] } },
  proposal_equipment: {},
  gallery: {
    grid_uniform: { aliases: ["grid", "default"] },
    masonry: { aliases: ["slider", "carousel"] },
    overlay: { aliases: ["before_after"] },
  },
  economy_purchases: {
    vertical_stack: { aliases: ["default"] },
  },
  pricing: {},
  financing: {},
  testimonials: {
    overlap: { aliases: ["cards", "default"] },
    quote_header: { aliases: ["carousel"] },
  },
  social_proof: {},
  guarantees: {},
  process_steps: {
    vertical: { aliases: ["timeline"] },
    horizontal: {},
    cards: {},
  },
  faq: {
    list: { aliases: ["accordion", "default", "simple"] },
    two_column: { aliases: ["grid"] },
    interview: { aliases: ["editorial"] },
    headline: { aliases: ["typographic"] },
  },
  cta: {},
  signature: {},
  comparison: {},
  video: {
    hero: { aliases: ["embed", "default"] },
    split: { aliases: ["inline"] },
  },
  custom: {},
};

export function getSectionVariantOptions(sectionType: SectionType): SectionVariantOption[] {
  return SECTION_VARIANTS[sectionType].map((value) => {
    const behavior = SECTION_VARIANT_BEHAVIOR[sectionType][value] ?? {};
    return {
      value,
      label: VARIANT_LABELS[value] ?? value,
      icon: VARIANT_DISPLAY_ICONS[value] ?? "layout-template",
      ...behavior,
    };
  });
}

export function resolveSectionVariant(sectionType: SectionType, currentVariant: string): string {
  const options = getSectionVariantOptions(sectionType);
  const exactMatch = options.find((option) => option.value === currentVariant);
  if (exactMatch) return exactMatch.value;
  const aliasMatch = options.find((option) => option.aliases?.includes(currentVariant));
  return aliasMatch?.value ?? currentVariant;
}

export const SECTION_FIELD_CONFIG: Record<SectionType, DynamicField[]> = {
  cover: [...COVER_FIELD_CONFIG],
  introduction: [
    {
      name: "greeting",
      label: "Saudação",
      type: "text",
      group: "Conteúdo",
      helperText: "Palavra de abertura antes do nome do cliente (ex.: Prezada, Prezado, Para).",
      aiFieldPurpose: "Saudação/vocativo da introdução da proposta (ex.: Prezado, Prezada, Para).",
    },
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "alignment"),
  ],
  about_company: [
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "alignment"),
    { name: "image", label: "Imagem da empresa ou equipe", type: "image", group: "Conteúdo" },
    {
      name: "eyebrow",
      label: "Rótulo acima do título",
      type: "text",
      group: "Conteúdo",
      helperText:
        "Texto pequeno acima do título (ex.: Sobre nós). Usado nas variantes Hero, Editorial, Etapas e Split.",
    },
    {
      name: "quote",
      label: "Frase destaque (manifesto)",
      type: "text",
      group: "Conteúdo",
      editorMode: "compactRichText",
      visibleWhen: { field: "variant", equals: "manifesto" },
      helperText:
        "Frase de impacto principal. Use <em>itálico</em> para destacar palavras. Usado na variante Manifesto.",
      aiFieldPurpose:
        "Frase de manifesto da empresa: impactante, usa <em>itálico</em> para destaque visual em palavras-chave.",
    },
    {
      name: "signature",
      label: "Tagline ou assinatura",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "editorial-split" },
      helperText: "Uma linha que resume o posicionamento da empresa. Usado na variante Editorial.",
    },
    {
      name: "stats",
      label: "Estatísticas (grade de números)",
      type: "table",
      columns: ["value", "suffix", "label"],
      group: "Conteúdo",
      tableAddRowLabel: "Adicionar estatística",
      maxRows: 4,
      visibleWhen: { field: "variant", equals: "hero" },
      helperText:
        "Grade com até 4 estatísticas. Colunas: valor (ex.: 500), sufixo (ex.: +), rótulo (ex.: PROJETOS ENTREGUES). Usado na variante Hero.",
    },
    {
      name: "features",
      label: "Diferenciais com check",
      type: "table",
      columns: ["title", "description"],
      group: "Conteúdo",
      tableAddRowLabel: "Adicionar diferencial",
      maxRows: 5,
      visibleWhen: { field: "variant", equals: "split-proof" },
      helperText:
        "Lista de diferenciais com ícone de check. Colunas: título em destaque, descrição complementar. Usado na variante Split com prova social.",
    },
    {
      name: "badge_value",
      label: "Destaque numérico (badge)",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equalsAny: ["editorial-split", "split-proof"] },
      helperText:
        "Número em destaque flutuante (ex.: +500, +12k MWh). Usado nas variantes Editorial e Split.",
    },
    {
      name: "badge_label",
      label: "Rótulo do badge",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equalsAny: ["editorial-split", "split-proof"] },
      helperText:
        "Rótulo abaixo do destaque numérico (ex.: SISTEMAS INSTALADOS). Usado nas variantes Editorial e Split.",
    },
    {
      name: "tag_top",
      label: "Tag flutuante superior",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "split-proof" },
      helperText:
        "Pílula de texto que flutua sobre a imagem (ex.: Empresa ativa desde 2014). Usado na variante Split.",
    },
    {
      name: "meta_value",
      label: "Meta — valor",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "manifesto" },
      helperText: "Número em destaque no canto (ex.: + de 500). Usado na variante Manifesto.",
    },
    {
      name: "meta_label",
      label: "Meta — rótulo",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "manifesto" },
      helperText:
        "Rótulo abaixo do meta valor (ex.: projetos entregues desde 2014). Usado na variante Manifesto.",
    },
  ],
  solution: [
    {
      name: "title",
      label: "Título da seção",
      type: "text",
      group: "Conteúdo",
      editorMode: "compactRichText",
      aiFieldPurpose: "Título da seção Solução (ex.: nome da etapa ou do bloco).",
    },
    {
      name: "solutionName",
      label: "Título",
      type: "text",
      group: "Conteúdo",
      helperText: "Uma linha que nomeia a proposta de forma clara e humana.",
      aiFieldPurpose:
        "Nome curto e humano da proposta de solução (uma linha), sem jargão técnico excessivo.",
    },
    {
      name: "text",
      label: "Descrição",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      helperText: "Evite detalhes técnicos. Foque no valor da solução.",
      aiFieldPurpose:
        "Descrição da solução em HTML: benefícios e clareza para o cliente; evitar detalhamento técnico profundo.",
    },
    {
      name: "benefits",
      label: "Benefícios",
      type: "table",
      group: "Conteúdo",
      columns: ["text", "icon"],
      minRows: 1,
      maxRows: 5,
      tableIncludeRowId: true,
      defaultNewRowIcon: "sparkles",
      helperText: "Entre 1 e 5 itens. Evite detalhes técnicos. Foque no valor da solução.",
    },
    {
      name: "howItWorks",
      label: "Como funciona (opcional)",
      type: "text",
      group: "Conteúdo",
      multiline: true,
      helperText: "Visão geral simples — sem etapas operacionais detalhadas.",
      aiFieldPurpose:
        "Texto plano explicando em linguagem simples como a solução funciona, sem checklist operacional detalhado.",
    },
    ...COVER_APPEARANCE_FIELD_CONFIG,
  ],
  diagnostic_energy: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "painPoints",
      label: "Dores (texto + ícone Lucide)",
      type: "table",
      group: "Dores e impactos",
      columns: ["text", "icon"],
    },
    {
      name: "impact",
      label: "Impactos financeiros (texto + ícone Lucide)",
      type: "table",
      group: "Dores e impactos",
      columns: ["text", "icon"],
    },
    {
      name: "highlightText",
      label: "Frase de destaque",
      type: "text",
      group: "Dores e impactos",
      aiFieldPurpose:
        "Uma frase curta e forte que resume o custo de adiar a decisão ou o impacto financeiro.",
    },
    {
      name: "highlightIcon",
      label: "Ícone do destaque",
      type: "select",
      group: "Dores e impactos",
      helperText: "Selecione qualquer ícone Lucide.",
    },
    {
      name: "painIconColor",
      label: "Cor dos ícones - Dores",
      type: "color",
      group: "Dores e impactos",
      helperText: "Padrão: cor primária do tema.",
    },
    {
      name: "impactIconColor",
      label: "Cor dos ícones - Impactos financeiros",
      type: "color",
      group: "Dores e impactos",
      helperText: "Padrão: cor secundária do tema.",
    },
    {
      name: "highlightIconColor",
      label: "Cor do ícone - Frase de destaque",
      type: "color",
      group: "Dores e impactos",
      helperText: "Padrão: cor primária do tema.",
    },
  ],
  generation_consumption: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "sectionSubtitle",
      label: "Subtítulo da seção",
      type: "text",
      group: "Conteúdo",
      helperText: "Linha curta abaixo do título (opcional).",
    },
  ],
  proposal_equipment: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "sectionSubtitle",
      label: "Subtítulo da seção",
      type: "text",
      group: "Conteúdo",
      helperText: "Linha abaixo do título (ex.: componentes do projeto).",
    },
    {
      name: "equipmentLines",
      label: "Equipamentos",
      type: "proposal_equipment_lines",
      group: "Conteúdo",
    },
  ],
  gallery: [
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "text"),
    {
      name: "eyebrow",
      label: "Rótulo acima do título",
      type: "text",
      group: "Conteúdo",
      helperText: "Texto pequeno acima do título (ex.: Portfólio, Galeria, Cases recentes).",
      aiFieldPurpose: "Rótulo curto acima do título da galeria (ex.: Portfólio, Cases).",
    },
    {
      name: "countLabel",
      label: "Rótulo da contagem",
      type: "text",
      group: "Conteúdo",
      helperText:
        "Texto após a contagem (ex.: 'projetos selecionados', 'imagens'). Vazio para ocultar.",
    },
    {
      name: "items",
      label: "Itens da galeria",
      type: "table",
      columns: ["title", "description", "photo"],
      group: "Conteúdo",
      tableIncludeRowId: true,
      tableMultilineColumns: ["description"],
      tableAddRowLabel: "Adicionar imagem",
      helperText:
        "Cada item: imagem + título e descrição opcionais. Layouts se adaptam aos itens com e sem legenda.",
    },
  ],
  economy_purchases: [
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "title"),
    {
      name: "horizonYears",
      label: "Horizonte",
      type: "select",
      group: "Conteúdo",
      selectDisplay: "segmented",
      options: [
        { label: "5 anos", value: "5" },
        { label: "10 anos", value: "10" },
      ],
      helperText:
        "Período usado para o total economizado (economia anual × anos, ou mensal × 12 × anos).",
    },
    {
      name: "eyebrow",
      label: "Rótulo acima do valor",
      type: "text",
      group: "Conteúdo",
      helperText:
        "Texto pequeno em destaque (ex.: 'em 10 anos de economia'). Use {{anos}} para o horizonte selecionado.",
    },
    {
      name: "amountLabel",
      label: "Rótulo do valor",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "split" },
      helperText:
        "Linha curta acima do valor monetário (ex.: 'Total que você deixa de pagar'). Usado no Split.",
    },
    {
      name: "description",
      label: "Descrição",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      visibleWhen: { field: "variant", equalsAny: ["vertical_stack", "split"] },
      helperText:
        "Texto contextual abaixo do valor. Use {{anos}} e {{economia_total}}. Usado no Empilhado e no Split.",
    },
    {
      name: "dividerLabel",
      label: "Rótulo do divisor",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "vertical_stack" },
      helperText:
        "Texto que aparece sobre a linha divisória antes dos itens (ex.: 'O que você poderia adquirir'). Usado no Empilhado.",
    },
    {
      name: "listTitle",
      label: "Título da lista",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "split" },
      helperText:
        "Título acima da lista de itens equivalentes (ex.: 'Equivalente a'). Usado no Split.",
    },
    {
      name: "title",
      label: "Título",
      type: "text",
      group: "Conteúdo",
      editorMode: "compactRichText",
      visibleWhen: { field: "variant", equals: "inverted" },
      helperText:
        "Frase principal acima dos cards (ex.: 'No que essa economia se transforma:'). Usado na Hierarquia invertida.",
    },
    {
      name: "anchorLabel",
      label: "Rótulo da âncora",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "inverted" },
      helperText:
        "Texto antes do valor no rodapé escuro (ex.: 'Valor que sua economia representa em {{anos}} anos:'). Usado na Hierarquia invertida.",
    },
    {
      name: "narrativeQuote",
      label: "Frase narrativa (com valor)",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      visibleWhen: { field: "variant", equals: "narrative" },
      helperText:
        "Frase principal com o valor inline. Use {{economia_total}} onde o valor deve aparecer e {{anos}} para o período. Usado na Narrativa inline.",
    },
    {
      name: "narrativeAction",
      label: "Linha de ação",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "narrative" },
      helperText:
        "Frase em destaque antes dos tiles (ex.: 'trocar a sua conta de luz por:'). Usado na Narrativa inline.",
    },
    {
      name: "narrativeFooter",
      label: "Rodapé",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      visibleWhen: { field: "variant", equals: "narrative" },
      helperText: "Linha sutil abaixo dos tiles. Use {{anos}}. Usado na Narrativa inline.",
    },
    {
      name: "purchaseItems",
      label: "Itens (nome, preço unitário, ícone Lucide)",
      type: "table",
      group: "Conteúdo",
      columns: ["name", "unitPrice", "icon"],
      tableIncludeRowId: true,
      defaultNewRowIcon: "package",
      helperText:
        "Preço unitário em reais. Ícone em kebab-case (ex.: bicycle). Linhas com quantidade menor que 1 ficam ocultas.",
    },
  ],
  pricing: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "paymentConditions",
      label: "Condições de pagamento",
      type: "text",
      aiFieldPurpose:
        "Texto sobre formas de pagamento, prazos e condições comerciais do investimento.",
    },
    { name: "showDiscountRow", label: "Exibir linha de desconto", type: "toggle" },
  ],
  financing: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "title",
      label: "Título do financiamento",
      type: "text",
      aiFieldPurpose: "Título específico do bloco de financiamento.",
    },
    {
      name: "helperText",
      label: "Texto de apoio",
      type: "text",
      aiFieldPurpose: "Texto de apoio ao financiamento (benefícios, observações, próximos passos).",
    },
  ],
  testimonials: [
    {
      name: "title",
      label: "Título",
      type: "text",
      group: "Conteúdo",
      editorMode: "compactRichText",
      aiFieldPurpose:
        "Título curto da seção de depoimentos. Não incluir citações ou nomes de clientes; isso fica nos itens de depoimento.",
    },
    {
      name: "text",
      label: "Descrição",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      aiFieldPurpose:
        "Texto introdutório (HTML) que apresenta a seção de depoimentos. Não escrever depoimentos fictícios, aspas, histórias de clientes nem lista de depoimentos; use apenas uma introdução neutra e institucional.",
    },
    {
      name: "sectionEyebrow",
      label: "Rótulo acima do título",
      type: "text",
      group: "Conteúdo",
      helperText: "Opcional. Linha curta acima do título (ex.: Depoimentos).",
    },
    {
      name: "items",
      label: "Depoimentos",
      type: "table",
      group: "Conteúdo",
      columns: ["name", "subtitle", "text", "photo"],
      tableMultilineColumns: ["text"],
      tableAddRowLabel: "Adicionar depoimento",
      helperText:
        "Nomes, textos e fotos dos depoimentos. A descrição acima é só a introdução da seção.",
    },
    ...COVER_APPEARANCE_FIELD_CONFIG,
  ],
  social_proof: [
    ...COMMON_SECTION_BASE_FIELDS,
    { name: "items", label: "Itens de prova social", type: "list" },
  ],
  guarantees: [...COMMON_SECTION_BASE_FIELDS, { name: "items", label: "Garantias", type: "list" }],
  process_steps: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "items",
      label: "Etapas do processo",
      type: "table",
      columns: ["icon", "title", "description", "estimatedTime"],
      group: "Conteúdo",
      defaultNewRowIcon: "clipboard-list",
      helperText:
        "Configure ícone, título, descrição e tempo estimado (ex.: 2 dias, 1 semana) por etapa.",
    },
  ],
  faq: [
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "text"),
    {
      name: "eyebrow",
      label: "Rótulo acima do título",
      type: "text",
      group: "Conteúdo",
      helperText: "Texto pequeno acima do título (ex.: Perguntas frequentes, FAQ).",
      aiFieldPurpose: "Rótulo curto acima do título do FAQ (ex.: Perguntas frequentes).",
    },
    {
      name: "subtitle",
      label: "Subtítulo",
      type: "text",
      group: "Conteúdo",
      visibleWhen: { field: "variant", equals: "interview" },
      helperText: "Texto descritivo abaixo do título. Usado na variante Editorial entrevista.",
      aiFieldPurpose: "Texto curto que contextualiza o FAQ. Usado na variante Editorial.",
    },
    {
      name: "items",
      label: "Perguntas e respostas",
      type: "table",
      group: "Conteúdo",
      columns: ["question", "answer"],
      tableIncludeRowId: true,
      tableMultilineColumns: ["answer"],
      tableAddRowLabel: "Adicionar pergunta",
      helperText: "Cada item: pergunta + resposta. Use <strong> para destacar partes da resposta.",
    },
  ],
  cta: [
    ...COMMON_SECTION_BASE_FIELDS,
    {
      name: "proposalUrl",
      label: "URL base da proposta",
      type: "url",
      helperText:
        "Link usado nas ações e no QR Code. Serão adicionados ?action=accept|edit|reject. Campos de variáveis são aceitos.",
    },
    {
      name: "acceptEnabled",
      label: "Exibir aceitar",
      type: "toggle",
      group: "Ações",
    },
    {
      name: "editEnabled",
      label: "Exibir solicitar alteração",
      type: "toggle",
      group: "Ações",
    },
    {
      name: "rejectEnabled",
      label: "Exibir recusar",
      type: "toggle",
      group: "Ações",
    },
    {
      name: "dangerColor",
      label: "Cor da ação recusar",
      type: "color",
      group: "Aparência",
      helperText: "Opcional. Padrão: vermelho.",
    },
  ],
  signature: [
    ...COMMON_SECTION_BASE_FIELDS,
    { name: "signatureName", label: "Nome da assinatura", type: "text" },
  ],
  comparison: [
    ...COMMON_SECTION_BASE_FIELDS,
    { name: "beforeLabel", label: "Rótulo do antes", type: "text" },
    { name: "afterLabel", label: "Rótulo do depois", type: "text" },
  ],
  video: [
    ...COMMON_SECTION_BASE_FIELDS.filter((f) => f.name !== "text"),
    {
      name: "videoUrl",
      label: "URL do vídeo (YouTube/Vimeo)",
      type: "url",
      group: "Conteúdo",
      helperText: "Cole o link de YouTube ou Vimeo. O player aparece em 16:9.",
    },
    {
      name: "eyebrow",
      label: "Frase de destaque",
      type: "text",
      group: "Conteúdo",
      helperText:
        "Texto curto acima do título (ex.: Veja em vídeo, Assista, Caso real · Sorocaba/SP).",
      aiFieldPurpose: "Frase curta de destaque acima do título do vídeo (ex.: Assista, Caso real).",
    },
    {
      name: "description",
      label: "Descrição",
      type: "text",
      group: "Conteúdo",
      editorMode: "richText",
      aiFieldPurpose:
        "Texto descritivo do vídeo. Pode usar <strong> para destacar palavras. Tom profissional, foco em valor.",
    },
  ],
  custom: [...COMMON_SECTION_BASE_FIELDS],
};

export const SECTION_USES_RICH_TEXT_EDITOR: Record<SectionType, boolean> = {
  cover: false,
  introduction: false,
  about_company: false,
  diagnostic_energy: false,
  solution: false,
  generation_consumption: false,
  proposal_equipment: false,
  gallery: false,
  economy_purchases: false,
  pricing: false,
  financing: false,
  testimonials: false,
  social_proof: false,
  guarantees: false,
  process_steps: false,
  faq: false,
  cta: false,
  signature: false,
  comparison: false,
  video: false,
  custom: false,
};

const COMMON_SECTION_BASE_DEFAULTS: Record<string, unknown> = {
  title: "",
  text: "",
  backgroundImage: "",
  coverHeight: 100,
  overlayOpacity: 45,
  showSectionDivider: false,
  alignment: "left",
};

function withSectionBaseDefaults(fields: Record<string, unknown>): Record<string, unknown> {
  return { ...COMMON_SECTION_BASE_DEFAULTS, ...fields };
}

export const SECTION_DEFAULT_FIELDS: Record<SectionType, Record<string, unknown>> = {
  cover: {
    backgroundImage: "",
    coverHeight: 300,
    overlayOpacity: 45,
    title: "Template de Proposta Solar Residencial",
    subtitle: "<p>Preparado para {{nome_cliente}} em {{data_proposta}}</p>",
    highlight: "Proposta",
    showCompanyName: true,
    companyNamePlacement: "header",
    companyNameAlign: "center",
    showLogo: true,
    logoPlacement: "header",
    logoAlign: "left",
    logoSize: 100,
    logo: "",
    showSectionDivider: false,
    alignment: "center",
  },
  introduction: withSectionBaseDefaults({
    greeting: "Prezado(a)",
    title:
      "É com satisfação que apresentamos esta proposta de energia solar desenvolvida especialmente para o seu perfil de consumo.",
    text: "<p>Nossa solução pode reduzir significativamente sua conta de energia com tecnologia de alta eficiência e suporte completo do projeto à ativação.</p><p>Estamos à disposição para esclarecer qualquer dúvida.</p>",
  }),
  about_company: withSectionBaseDefaults({
    title: "Sobre a {{nome_empresa}}",
    text: "<p>Somos especialistas em energia solar fotovoltaica com centenas de projetos entregues. Nossa missão é tornar a transição para energia limpa um processo claro, sem surpresas e com economia real desde o primeiro mês.</p>",
    image: "",
    eyebrow: "Sobre nós",
    quote:
      "Acreditamos que <em>energia limpa</em> não pode ser complicada. Por isso entregamos sistemas solares que apenas funcionam — com a confiança de quem já fez isso centenas de vezes.",
    signature: "Engenharia, instalação e pós-venda em um só time",
    stats: [
      { value: "500", suffix: "+", label: "PROJETOS ENTREGUES" },
      { value: "25", suffix: "a", label: "GARANTIA DE GERAÇÃO" },
      { value: "100", suffix: "%", label: "EQUIPE CERTIFICADA" },
    ],
    features: [
      {
        title: "Equipe técnica certificada",
        description: "Engenheiros e instaladores com registro CREA ativo.",
      },
      {
        title: "Equipamentos Tier 1",
        description: "Painéis e inversores com garantia de até 25 anos.",
      },
      {
        title: "Suporte vitalício",
        description: "Monitoramento e manutenção pelo time que instalou o sistema.",
      },
    ],
    badge_value: "+500",
    badge_label: "SISTEMAS INSTALADOS",
    tag_top: "Empresa ativa desde 2014",
    meta_value: "+ de 500",
    meta_label: "projetos entregues\ndesde 2014",
  }),
  diagnostic_energy: withSectionBaseDefaults({
    painPoints: [
      { text: "Aumento constante da conta", icon: "trending-up" },
      { text: "Dependência da concessionária", icon: "plug" },
      { text: "Custos imprevisíveis", icon: "alert-circle" },
    ],
    impact: [
      { text: "Mais de R$ 48 mil gastos em 5 anos", icon: "dollar-sign" },
      { text: "Risco de novos reajustes anuais", icon: "trending-up" },
      { text: "Pouca previsibilidade no orçamento", icon: "wallet" },
    ],
    highlightText: "Cada mês sem decisão aumenta a perda financeira acumulada.",
    highlightIcon: "zap",
    painIconColor: "",
    impactIconColor: "",
    highlightIconColor: "",
  }),
  solution: withSectionBaseDefaults({
    title: "Solução",
    solutionName: "Energia solar alinhada ao seu consumo",
    text: "<p>Com base no seu perfil de consumo, a {{nome_empresa}} propõe gerar parte da energia no próprio imóvel, reduzindo o que você precisa comprar da rede mês a mês.</p><p>Você mantém a rede como apoio e ganha previsibilidade frente a reajustes, com projeto e acompanhamento da equipe até a usina entrar em operação.</p>",
    benefits: [
      {
        id: "sol-d1",
        text: "Menos dependência exclusiva da tarifa da concessionária",
        icon: "shield",
      },
      { id: "sol-d2", text: "Energia produzida onde você consome", icon: "zap" },
      { id: "sol-d3", text: "Suporte da equipe do estudo à operação", icon: "users" },
    ],
    howItWorks:
      "Estudamos consumo e telhado ou área disponível, dimensionamos a geração para acompanhar seu perfil e cuidamos da conexão com a rede conforme as regras locais. No dia a dia, a energia gerada no local abate parte da fatura, e você pode contar com a equipe para dúvidas.",
  }),
  generation_consumption: withSectionBaseDefaults({
    title: "Dados de Geração e Consumo",
    sectionSubtitle: "Desempenho estimado do sistema",
    text: "<p>Visão consolidada da capacidade instalada, geração estimada e comparativo de consumo versus produção ao longo do ano.</p>",
    meses: [...DEFAULT_GENERATION_MESES],
    consumoMensal: [...DEFAULT_CONSUMO_SERIES],
    producaoMensal: [...DEFAULT_PRODUCAO_SERIES],
  }),
  proposal_equipment: withSectionBaseDefaults({
    title: "Equipamentos do sistema",
    sectionSubtitle: "Componentes selecionados para seu projeto",
    text: "<p>Confira abaixo os principais equipamentos que compõem a solução proposta.</p>",
    equipmentLines: [],
  }),
  gallery: withSectionBaseDefaults({
    title: "Obras realizadas",
    eyebrow: "Portfólio",
    countLabel: "projetos selecionados",
    items: [],
  }),
  economy_purchases: withSectionBaseDefaults({
    title: "Economia — poder de compra",
    text: "<p>Com base na economia estimada, veja o que esse valor representa em poder de compra nos próximos anos.</p>",
    horizonYears: "10",
    eyebrow: "em {{anos}} anos de economia",
    amountLabel: "Total que você deixa de pagar",
    description:
      "<p>Total que você deixaria de pagar à concessionária ao longo dos próximos {{anos}} anos com o seu sistema solar em operação.</p>",
    dividerLabel: "O que você poderia adquirir",
    listTitle: "Equivalente a",
    anchorLabel: "Valor que sua economia representa em {{anos}} anos:",
    narrativeQuote:
      "<p><em>Em {{anos}} anos,</em> a sua economia chega a {{economia_total}} — e isso é o suficiente para</p>",
    narrativeAction: "trocar a sua conta de luz por:",
    narrativeFooter:
      "<p>… ou somar tudo isso ao seu <strong>orçamento dos próximos {{anos}} anos</strong>.</p>",
    purchaseItems: [
      { id: "ep-1", name: "iPhone 17", unitPrice: "8000", icon: "smartphone" },
      { id: "ep-2", name: "Carro popular", unitPrice: "78000", icon: "car" },
      { id: "ep-3", name: "Viagem internacional", unitPrice: "15000", icon: "plane" },
    ],
  }),
  pricing: withSectionBaseDefaults({
    paymentConditions: "",
    showDiscountRow: true,
  }),
  financing: withSectionBaseDefaults({
    helperText: "Parcela e prazo são vinculados à simulação de financiamento.",
  }),
  testimonials: withSectionBaseDefaults({
    sectionEyebrow: "Depoimentos",
    title: "O que nossos clientes dizem",
    text: "<p>Histórias de quem já confiou no nosso trabalho.</p>",
    items: [
      {
        name: "Ana Costa",
        subtitle: "Residencial",
        text: "Processo claro do primeiro contato à instalação. Equipe muito atenciosa.",
        photo: "",
      },
      {
        name: "Roberto Lima",
        subtitle: "Comércio",
        text: "Redução visível na conta e suporte depois da obra.",
        photo: "",
      },
    ],
  }),
  social_proof: withSectionBaseDefaults({ items: [] }),
  guarantees: withSectionBaseDefaults({ items: [] }),
  process_steps: withSectionBaseDefaults({
    title: "Nosso processo",
    text: "<p>Etapas claras desde o primeiro contato até a usina em operação.</p>",
    items: [
      {
        title: "Visita técnica",
        description: "Análise de telhado, consumo e viabilidade de conexão.",
        estimatedTime: "3–5 dias",
      },
      {
        title: "Projeto e documentação",
        description: "Dimensionamento e protocolo junto à concessionária.",
        estimatedTime: "2–4 semanas",
      },
      {
        title: "Instalação",
        description: "Montagem dos módulos, inversor e testes.",
        estimatedTime: "2–3 dias",
      },
      {
        title: "Ativação",
        description: "Vistoria, religação e acompanhamento inicial.",
        estimatedTime: "1–2 semanas",
      },
    ],
  }),
  faq: withSectionBaseDefaults({
    title: "As principais dúvidas, respondidas.",
    eyebrow: "Perguntas frequentes",
    subtitle: "Respostas em formato direto, agrupadas para facilitar a leitura na proposta.",
    items: [],
  }),
  cta: withSectionBaseDefaults({
    title: "Como deseja prosseguir?",
    text: "<p>Registre sua decisão: aceitar a proposta, solicitar alterações ou recusar.</p>",
    proposalUrl: "",
    acceptEnabled: true,
    editEnabled: true,
    rejectEnabled: true,
    dangerColor: "",
    alignment: "center",
  }),
  signature: withSectionBaseDefaults({ signatureName: "" }),
  comparison: withSectionBaseDefaults({
    beforeLabel: "Custo mensal atual de energia",
    afterLabel: "Custo mensal projetado com solar",
  }),
  video: withSectionBaseDefaults({
    videoUrl: "",
    eyebrow: "Veja em vídeo",
    title: "Como funciona uma instalação solar do início ao fim.",
    description:
      "<p>Um tour pela nossa equipe técnica em obra: do <strong>dimensionamento ao comissionamento</strong>.</p>",
  }),
  custom: withSectionBaseDefaults({}),
};
