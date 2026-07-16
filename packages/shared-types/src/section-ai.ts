import type { ProposalTemplateSectionKey } from "./proposal-templates";

export type SectionAiRefinement =
  | "mais_curto"
  | "mais_persuasivo"
  | "foco_economia"
  | "foco_sustentabilidade";

export type SectionAiInputType = "text" | "textarea" | "select" | "toggle";

export interface SectionAiInputOption {
  value: string;
  label: string;
  icon?: string;
}

export interface SectionAiInputDefinition {
  key: string;
  label: string;
  type: SectionAiInputType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  options?: SectionAiInputOption[];
  defaultValue?: string | boolean;
  renderAfterInstructions?: boolean;
}

export interface SectionAiPromptRules {
  objective: string;
  requiredTopics: string[];
  writingGuidelines: string[];
}

export interface SectionAiOutputMapper {
  titleField: string;
  descriptionField: string;
}

export interface SectionAiProfile {
  sectionType: ProposalTemplateSectionKey | string;
  displayName: string;
  inputs: SectionAiInputDefinition[];
  promptRules: SectionAiPromptRules;
  allowedRefinements: SectionAiRefinement[];
  outputMapper: SectionAiOutputMapper;
}

export const SECTION_AI_BASE_REFINEMENTS: SectionAiRefinement[] = ["mais_curto", "mais_persuasivo"];

export const SECTION_AI_PROFILES: SectionAiProfile[] = [
  {
    sectionType: "introduction",
    displayName: "Introdução",
    inputs: [
      {
        key: "tipo_cliente",
        label: "Tipo de cliente",
        type: "select",
        required: true,
        defaultValue: "residencial",
        options: [
          { value: "residencial", label: "Residencial", icon: "home" },
          { value: "comercial", label: "Comercial", icon: "building2" },
          { value: "industrial", label: "Industrial", icon: "factory" },
        ],
      },
      {
        key: "tom",
        label: "Tom",
        type: "select",
        required: true,
        defaultValue: "consultivo",
        options: [
          { value: "profissional", label: "Profissional", icon: "briefcase" },
          { value: "consultivo", label: "Consultivo", icon: "handshake" },
          { value: "persuasivo", label: "Persuasivo", icon: "megaphone" },
        ],
      },
      {
        key: "objetivo",
        label: "Objetivo principal",
        type: "select",
        required: true,
        defaultValue: "economia",
        options: [
          { value: "economia", label: "Economia", icon: "piggy-bank" },
          { value: "sustentabilidade", label: "Sustentabilidade", icon: "leaf" },
          { value: "retorno_financeiro", label: "Retorno financeiro", icon: "bar-chart-3" },
        ],
      },
      {
        key: "diferencial_empresa",
        label: "Diferencial da empresa (opcional)",
        type: "text",
        placeholder: "Ex.: Equipe própria e monitoramento contínuo",
        maxLength: 280,
      },
    ],
    promptRules: {
      objective:
        'Introduzir o projeto e este documento: o que foi considerado ou preparado (estudo, consumo, cenário), o objetivo da proposta e como as próximas seções ajudam na decisão — sem substituir a seção institucional "Sobre a empresa".',
      requiredTopics: [
        "Enquadrar o trabalho realizado ou a base do estudo (sem inventar dados que não estejam nos inputs)",
        "Objetivo desta proposta e leitura sugerida das seções seguintes",
        "Conectar ao benefício principal conforme objetivo selecionado, de forma objetiva",
      ],
      writingGuidelines: [
        "Linguagem profissional, direta e humana",
        "Parágrafos curtos e escaneáveis",
        'Não escrever "quem somos", história da empresa nem pitch institucional longo — isso é papel da seção Sobre a empresa',
      ],
    },
    allowedRefinements: [...SECTION_AI_BASE_REFINEMENTS, "foco_economia", "foco_sustentabilidade"],
    outputMapper: { titleField: "title", descriptionField: "text" },
  },
  {
    sectionType: "about_company",
    displayName: "Sobre a Empresa",
    inputs: [
      {
        key: "tom",
        label: "Tom",
        type: "select",
        required: true,
        defaultValue: "profissional",
        options: [
          { value: "profissional", label: "Profissional", icon: "briefcase" },
          { value: "consultivo", label: "Consultivo", icon: "handshake" },
          { value: "persuasivo", label: "Persuasivo", icon: "megaphone" },
        ],
      },
      {
        key: "anos_mercado",
        label: "Tempo de mercado (opcional)",
        type: "text",
        placeholder: "Ex.: 12 anos",
        maxLength: 80,
      },
      {
        key: "principal_diferencial",
        label: "Principal diferencial (opcional)",
        type: "text",
        placeholder: "Ex.: Projetos com engenharia própria",
        maxLength: 180,
      },
      {
        key: "credenciais",
        label: "Credenciais e provas (opcional)",
        type: "textarea",
        placeholder: "Ex.: certificações, cases, número de projetos, nota média dos clientes.",
        maxLength: 420,
      },
      {
        key: "incluir_prova_social",
        label: "Incluir parágrafo de prova social",
        type: "toggle",
        defaultValue: true,
        renderAfterInstructions: true,
        helperText:
          "Quando ativo, a IA acrescenta um trecho curto reforçando credibilidade (sem inventar números). Afeta só o texto gerado, não o layout da seção.",
      },
    ],
    promptRules: {
      objective:
        "Apresentar a empresa com credibilidade, destacando competência técnica e confiança para execução.",
      requiredTopics: [
        "Evidenciar experiência e consistência de entrega",
        "Destacar diferenciais competitivos reais",
        "Transmitir segurança para decisão do cliente",
      ],
      writingGuidelines: [
        "Evitar clichês e superlativos vazios",
        "Trazer argumentos verificáveis sempre que possível",
        "Manter tom institucional com leitura fluida",
        "Não repetir a Introdução (escopo do projeto, estrutura do documento) — foco só na empresa",
      ],
    },
    allowedRefinements: [...SECTION_AI_BASE_REFINEMENTS],
    outputMapper: { titleField: "title", descriptionField: "text" },
  },
  {
    sectionType: "solution",
    displayName: "Solução",
    inputs: [
      {
        key: "contexto_proposta",
        label: "Contexto (opcional)",
        type: "textarea",
        placeholder:
          "Ex.: cliente busca reduzir custo operacional; operação com equipe remota; prazo de decisão curto.",
        maxLength: 600,
        helperText:
          "Ajuda a IA sem impor setor ou equipamentos. Evite números e especificações técnicas.",
      },
      {
        key: "tom",
        label: "Tom",
        type: "select",
        required: true,
        defaultValue: "consultivo",
        options: [
          { value: "profissional", label: "Profissional", icon: "briefcase" },
          { value: "consultivo", label: "Consultivo", icon: "handshake" },
          { value: "acessivel", label: "Acessível", icon: "smile" },
        ],
      },
    ],
    promptRules: {
      objective:
        "Explicar em alto nível O QUE a solução faz pelo cliente e POR QUE melhora o cenário dele — como conversa da empresa com o cliente, não como descrição do documento.",
      requiredTopics: [
        "Pelo menos um parágrafo com situação concreta do cliente e efeito da solução",
        "Benefícios tangíveis (conta, risco, operação, sustentabilidade) sem repetir sinônimos da mesma ideia",
        'Segunda pessoa (você): não tratar o cliente na terceira pessoa com o próprio nome (evitar "perfil de consumo de Fulano", "Para Fulano, estruturamos")',
      ],
      writingGuidelines: [
        "Proibido texto meta: não mencionar 'esta proposta', 'nesta seção', 'linguagem acessível', 'sem detalhes técnicos', 'nosso objetivo é dar clareza'",
        "Endereçar o leitor em segunda pessoa; não usar o nome do cliente como se estivesse falando sobre ele com outra pessoa",
        "Não mencionar equipamentos, medidas, quantidades, marcas, kWp, kWh ou métricas técnicas",
        "Não incluir etapas operacionais detalhadas (isso pertence a outras seções da proposta)",
        "Priorizar resultados no dia a dia do cliente em vez de intenções da empresa sobre comunicação",
      ],
    },
    allowedRefinements: [...SECTION_AI_BASE_REFINEMENTS],
    outputMapper: { titleField: "title", descriptionField: "text" },
  },
  {
    sectionType: "diagnostic_energy",
    displayName: "Diagnóstico Energético",
    inputs: [
      {
        key: "monthlyBill",
        label: "Conta mensal atual (R$)",
        type: "text",
        required: false,
        defaultValue: "650",
        placeholder: "Ex.: 650",
        maxLength: 12,
        helperText: "Único campo principal para gerar automaticamente esta seção.",
      },
      {
        key: "show_optional_inputs",
        label: "Mostrar campos opcionais",
        type: "toggle",
        defaultValue: false,
        renderAfterInstructions: true,
      },
      {
        key: "consumptionKwh",
        label: "Consumo médio (kWh/mês) - opcional",
        type: "text",
        placeholder: "Ex.: 540",
        maxLength: 12,
      },
      {
        key: "city",
        label: "Cidade - opcional",
        type: "text",
        placeholder: "Ex.: Campinas",
        maxLength: 80,
      },
      {
        key: "state",
        label: "Estado - opcional",
        type: "text",
        placeholder: "Ex.: SP",
        maxLength: 40,
      },
    ],
    promptRules: {
      objective:
        "Diagnosticar o cenário atual de energia, quantificar perda financeira e preparar a venda da solução solar.",
      requiredTopics: [
        "Traduzir conta de energia em impacto financeiro anual e acumulado",
        "Criar urgência sem exagero",
        "Conectar dor atual com oportunidade de decisão estratégica",
      ],
      writingGuidelines: [
        "Linguagem simples, objetiva e consultiva",
        "Foco em números e previsibilidade de custos usando SOMENTE os tokens do template para valores monetários:",
        "{{conta_mensal_energia_br}}, {{gasto_anual_energia_br}}, {{custo_5_anos_energia_br}}, {{custo_10_anos_energia_br}}",
        "Evitar afirmações absolutas e promessas irreais",
      ],
    },
    allowedRefinements: [...SECTION_AI_BASE_REFINEMENTS, "foco_economia"],
    outputMapper: { titleField: "title", descriptionField: "text" },
  },
];

const PROFILE_BY_SECTION_TYPE = new Map(
  SECTION_AI_PROFILES.map((profile) => [profile.sectionType, profile] as const)
);

export function resolveSectionAiProfile(sectionType: string): SectionAiProfile | null {
  return PROFILE_BY_SECTION_TYPE.get(sectionType) ?? null;
}
