"use client";

import { useState, useMemo, useEffect, useRef, Component, type ReactNode } from "react";
import type { ProposalSection, ProposalStyles, SectionType } from "./types";
import { renderSectionContent } from "./section-render/section-registry";
import { SectionShell } from "./section-render/section-shell";
import type { PreviewRenderVariables, SectionRenderOptions } from "./section-render/types";
import {
  SECTION_CATEGORY_BY_TYPE,
  SECTION_CATEGORY_ORDER,
  SECTION_DEFAULT_FIELDS,
  SECTION_TYPE_LABELS,
  SECTION_TYPES,
  SECTION_VARIANTS,
  VARIANT_LABELS,
} from "./section-fields";
import { Cover } from "@/components/sections/Cover/Cover";

const SECTION_META: Record<SectionType, { desc: string; vars: number }> = {
  cover: { desc: "Página de abertura com logo, nome do cliente e imagem de destaque.", vars: 4 },
  introduction: { desc: "Mensagem personalizada de abertura para o cliente.", vars: 3 },
  about_company: {
    desc: "Apresentação da empresa, missão, anos de experiência e diferenciais.",
    vars: 5,
  },
  diagnostic_energy: {
    desc: "Análise do consumo elétrico atual com gráficos e comparativos mensais.",
    vars: 6,
  },
  solution: {
    desc: "Apresentação da solução proposta com especificações técnicas do sistema.",
    vars: 8,
  },
  generation_consumption: { desc: "Comparativo de geração estimada vs. consumo mensal.", vars: 7 },
  proposal_equipment: {
    desc: "Lista dos equipamentos especificados: módulos, inversor e estrutura.",
    vars: 5,
  },
  gallery: { desc: "Galeria de fotos de projetos anteriores para gerar confiança.", vars: 0 },
  economy_purchases: {
    desc: "Demonstração do poder de compra com a economia gerada ao longo dos anos.",
    vars: 4,
  },
  pricing: {
    desc: "Detalhamento de valores com desconto, formas de pagamento e parcelamento.",
    vars: 7,
  },
  financing: { desc: "Opções de financiamento solar com simulação de parcelas e taxas.", vars: 6 },
  testimonials: { desc: "Depoimentos de clientes satisfeitos com projetos realizados.", vars: 2 },
  social_proof: {
    desc: "Números de projetos realizados, kWp instalados e clientes atendidos.",
    vars: 3,
  },
  guarantees: { desc: "Garantias do sistema: produto, desempenho e assistência técnica.", vars: 3 },
  process_steps: { desc: "Etapas do processo de instalação do início à conclusão.", vars: 2 },
  faq: { desc: "Perguntas frequentes sobre energia solar respondidas de forma direta.", vars: 0 },
  cta: { desc: "Chamada para ação com botão de aceite e campo de resposta.", vars: 2 },
  signature: {
    desc: "Bloco de assinatura digital com dados do contratante e contratado.",
    vars: 4,
  },
  comparison: { desc: "Tabela comparativa entre diferentes sistemas ou concorrentes.", vars: 5 },
  video: { desc: "Incorporação de vídeo explicativo ou depoimento em vídeo.", vars: 1 },
  custom: { desc: "Seção totalmente customizável com editor livre de conteúdo.", vars: 0 },
};

type MockupKind =
  | "cover"
  | "text"
  | "chart"
  | "pricing"
  | "list"
  | "media"
  | "testimonials"
  | "stats"
  | "signature"
  | "video"
  | "custom";

const TYPE_MOCKUP: Record<SectionType, MockupKind> = {
  cover: "cover",
  introduction: "text",
  about_company: "text",
  diagnostic_energy: "chart",
  solution: "text",
  generation_consumption: "chart",
  proposal_equipment: "list",
  gallery: "media",
  economy_purchases: "pricing",
  pricing: "pricing",
  financing: "pricing",
  testimonials: "testimonials",
  social_proof: "stats",
  guarantees: "stats",
  process_steps: "list",
  faq: "list",
  cta: "list",
  signature: "signature",
  comparison: "pricing",
  video: "video",
  custom: "custom",
};

function MockBar({
  w = "full",
  h = 3,
  color = "default",
}: {
  w?: string;
  h?: number;
  color?: "default" | "dark" | "accent" | "muted";
}) {
  const colors = {
    default: "bg-slate-200 dark:bg-slate-700",
    dark: "bg-slate-400 dark:bg-slate-500",
    accent: "bg-emerald-400",
    muted: "bg-slate-100 dark:bg-slate-800",
  };
  return (
    <div
      className={`rounded-sm ${colors[color]} ${w !== "full" ? `w-[${w}]` : "w-full"}`}
      style={{ height: h }}
    />
  );
}

function SectionMockup({ kind, large }: { kind: MockupKind; large?: boolean }) {
  const base = `flex flex-col gap-[3px] w-full h-full overflow-hidden rounded-sm bg-white dark:bg-slate-900 ${large ? "p-3 gap-[5px]" : "p-2"}`;
  const bar = large ? 5 : 3;

  if (kind === "cover")
    return (
      <div className={base}>
        <MockBar w="45%" h={bar} color="dark" />
        <div className="flex-1 rounded-sm bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
        <MockBar h={bar} color="accent" />
        <MockBar w="60%" h={bar} />
      </div>
    );
  if (kind === "chart")
    return (
      <div className={base}>
        <MockBar w="50%" h={bar} color="dark" />
        <MockBar w="75%" h={bar} />
        <div className="flex flex-1 items-end gap-[2px]">
          {[30, 50, 45, 70, 90, 100, 80].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i >= 4 ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  if (kind === "pricing")
    return (
      <div className={base}>
        <MockBar w="50%" h={bar} color="dark" />
        <div className="flex gap-[3px] flex-1">
          <div className="flex-1 flex flex-col gap-[2px] rounded-sm bg-slate-100 dark:bg-slate-800 p-1">
            <MockBar w="60%" h={bar} color="accent" />
            <MockBar h={bar - 1} />
            <MockBar w="75%" h={bar - 1} />
          </div>
          <div className="flex-1 flex flex-col gap-[2px] rounded-sm bg-slate-100 dark:bg-slate-800 p-1">
            <MockBar w="40%" h={bar} />
            <MockBar h={bar - 1} />
            <MockBar w="55%" h={bar - 1} />
          </div>
        </div>
        <MockBar h={bar} color="accent" />
      </div>
    );
  if (kind === "list")
    return (
      <div className={base}>
        <MockBar w="50%" h={bar} color="dark" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-[3px]">
            <div className="h-[7px] w-[7px] shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-1 flex-col gap-[2px]">
              <MockBar w="40%" h={bar - 1} />
              <MockBar h={bar - 1} />
            </div>
          </div>
        ))}
      </div>
    );
  if (kind === "media")
    return (
      <div className={base}>
        <MockBar w="40%" h={bar} color="dark" />
        <div className="flex flex-1 gap-[3px]">
          <div className="flex-1 rounded-sm bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
          <div className="flex-1 rounded-sm bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500" />
        </div>
        <MockBar h={bar} />
      </div>
    );
  if (kind === "testimonials")
    return (
      <div className={base}>
        <MockBar w="55%" h={bar} color="dark" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-[3px] rounded-sm bg-slate-100 dark:bg-slate-800 p-1"
          >
            <div className="h-[10px] w-[10px] shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="flex flex-1 flex-col gap-[2px]">
              <MockBar w="35%" h={bar - 1} />
              <MockBar h={bar - 1} />
            </div>
          </div>
        ))}
      </div>
    );
  if (kind === "stats")
    return (
      <div className={base}>
        <MockBar w="45%" h={bar} color="dark" />
        <div className="flex flex-1 gap-[3px]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-sm bg-slate-100 dark:bg-slate-800"
            >
              <div className="h-[8px] w-[8px] rounded-full bg-emerald-400" />
              <MockBar w="70%" h={bar - 1} />
            </div>
          ))}
        </div>
      </div>
    );
  if (kind === "signature")
    return (
      <div className={base}>
        <MockBar w="40%" h={bar} color="dark" />
        <div className="flex-1 rounded-sm border border-slate-200 dark:border-slate-700 p-1 flex flex-col justify-end gap-[2px]">
          <MockBar w="60%" h={bar} color="accent" />
          <MockBar w="80%" h={bar - 1} />
        </div>
      </div>
    );
  if (kind === "video")
    return (
      <div className={base}>
        <MockBar w="40%" h={bar} color="dark" />
        <div className="flex-1 rounded-sm bg-slate-800 dark:bg-slate-900 flex items-center justify-center">
          <div className="h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white/70" />
        </div>
      </div>
    );
  if (kind === "custom")
    return (
      <div className={`${base} items-center justify-center`}>
        <div className="text-slate-300 dark:text-slate-600 text-[18px] font-bold">+</div>
      </div>
    );
  return (
    <div className={base}>
      <MockBar w="55%" h={bar} color="dark" />
      <MockBar h={bar} />
      <MockBar w="85%" h={bar} />
      <MockBar w="70%" h={bar} />
      <MockBar w="50%" h={bar} color="accent" />
    </div>
  );
}

const DEMO_VARS: PreviewRenderVariables = {
  nome_cliente: "Maria Souza",
  nome_empresa: "Solar Prime",
  data_proposta: "24/04/2026",
  tamanho_sistema_kw: "8,4 kWp",
  modulos_sistema: "21 módulos 400W",
  inversor_sistema: "Fronius Symo 8.2",
  producao_anual: "11.760 kWh",
  investimento_total: "R$ 38.500",
  investimento_desconto: "R$ 35.000",
  economia_mensal: "R$ 650",
  economia_anual: "R$ 7.800",
  payback_anos: "4,5 anos",
  financiamento_parcela: "R$ 389",
  financiamento_meses: "84",
  financiamento_entrada: "R$ 0,00",
  comparacao_antes: "R$ 850",
  comparacao_depois: "R$ 200",
  conta_mensal_energia: 650,
  gasto_anual_energia: 7800,
  custo_5_anos_energia: 39000,
  custo_10_anos_energia: 78000,
  potencia_sistema_kwp: 8.4,
  geracao_mensal_kwh: 980,
  cobertura_consumo_pct: 91,
  equivalente_arvores_ano: 142,
};

const DEMO_BRANDING = {
  primaryColor: "#10b981",
  secondaryColor: "#1e293b",
  textColor: "#f8fafc",
  backgroundColor: "#0f172a",
};

const DEMO_FIELD_OVERRIDES: Partial<Record<SectionType, Record<string, unknown>>> = {
  introduction: {
    greeting: "Prezada",
    title:
      "É com satisfação que apresentamos esta proposta de energia solar desenvolvida especialmente para o seu perfil de consumo.",
    text: "<p>Nossa solução pode reduzir significativamente sua conta de energia com tecnologia de alta eficiência e suporte completo do projeto à ativação.</p><p>Estamos à disposição para esclarecer qualquer dúvida.</p>",
  },
  about_company: {
    image: "/cover-segments/_default/5.png",
  },
  custom: {
    text: "<p>Esta é uma seção personalizada. Use o editor para adicionar qualquer conteúdo: texto, listas, destaques ou tabelas de acordo com sua necessidade.</p>",
  },
  gallery: {
    eyebrow: "Portfólio",
    title: "Obras realizadas",
    countLabel: "projetos selecionados",
    items: [
      {
        id: "g-1",
        photo: "/cover-segments/residencial/1.png",
        title: "Residência em Atibaia, SP",
        description: "Sistema de 8,5 kWp em telhado cerâmico",
      },
      {
        id: "g-2",
        photo: "/cover-segments/comercial/1.png",
        title: "",
        description: "",
      },
      {
        id: "g-3",
        photo: "/cover-segments/industrial/1.png",
        title: "Galpão industrial, Jundiaí",
        description: "42 kWp com microinversores",
      },
      {
        id: "g-4",
        photo: "/cover-segments/rural/1.png",
        title: "Fazenda Boa Vista",
        description: "60 kWp em estrutura solo",
      },
      {
        id: "g-5",
        photo: "/cover-segments/residencial/1.png",
        title: "",
        description: "",
      },
      {
        id: "g-6",
        photo: "/cover-segments/comercial/1.png",
        title: "Comércio em Campinas",
        description: "15 kWp · payback em 4 anos",
      },
    ],
  },
  social_proof: {
    items: [
      "500+ projetos instalados",
      "8 MW de potência instalada",
      "98% de satisfação dos clientes",
    ],
  },
  guarantees: {
    items: [
      "25 anos de garantia de desempenho dos módulos",
      "10 anos de garantia do inversor",
      "5 anos de garantia de instalação",
    ],
  },
  faq: {
    eyebrow: "Perguntas frequentes",
    title: "As principais dúvidas, respondidas.",
    subtitle: "Respostas em formato direto, agrupadas para facilitar a leitura na proposta.",
    items: [
      {
        id: "faq-1",
        question: "Quanto tempo dura a instalação completa?",
        answer:
          "A instalação leva entre <strong>2 e 5 dias úteis</strong> para residências e até 15 dias para sistemas comerciais maiores.",
      },
      {
        id: "faq-2",
        question: "Os equipamentos têm garantia?",
        answer:
          "Sim. Painéis com <strong>25 anos de garantia de geração</strong>, inversores 10 anos e estrutura 10 anos.",
      },
      {
        id: "faq-3",
        question: "Preciso de manutenção frequente?",
        answer:
          "Não. Recomendamos apenas <strong>limpeza superficial dos painéis a cada 6 meses</strong> e inspeção visual anual.",
      },
      {
        id: "faq-4",
        question: "Como funciona em dias nublados ou de chuva?",
        answer:
          "O sistema continua gerando, com produção reduzida proporcional à incidência solar. O excedente dos dias ensolarados é compensado na sua conta.",
      },
      {
        id: "faq-5",
        question: "E se eu mudar de endereço?",
        answer:
          "O sistema pode ser desinstalado e reinstalado no novo imóvel — orçado separadamente. Ele também <strong>agrega valor à venda do imóvel</strong>.",
      },
      {
        id: "faq-6",
        question: "Como é a conexão com a concessionária?",
        answer:
          "Após a instalação, fazemos a homologação. O processo leva <strong>entre 30 e 60 dias</strong> e é conduzido pela nossa equipe.",
      },
    ],
  },
  video: {
    videoUrl: "https://www.youtube.com/watch?v=KA_uZ9otOlc",
    eyebrow: "Veja em vídeo",
    title: "Como funciona uma instalação solar do início ao fim.",
    description:
      "<p>Um tour de quatro minutos pela equipe técnica em obra: do <strong>dimensionamento ao comissionamento</strong>.</p>",
  },
};

function getDemoSection(type: SectionType, variant?: string): ProposalSection {
  const fields = {
    ...(SECTION_DEFAULT_FIELDS[type] ?? {}),
    ...(DEMO_FIELD_OVERRIDES[type] ?? {}),
  };
  const resolvedVariant =
    variant ?? String(fields["variant"] ?? SECTION_VARIANTS[type]?.[0] ?? "default");
  return {
    id: `demo-${type}-${resolvedVariant}`,
    type,
    variant: resolvedVariant,
    title: String(fields["title"] ?? ""),
    content: String(fields["text"] ?? fields["content"] ?? "<p></p>"),
    fields,
  };
}

const DEMO_COVER_CONTENT = {
  title: "Proposta de Energia Solar",
  subtitle: "<p>Preparada especialmente para <strong>Maria Souza</strong></p>",
  highlight: "Proposta",
  showCompanyName: true,
  companyNamePlacement: "header" as const,
  companyNameAlign: "left" as const,
  showLogo: false,
  logoPlacement: "header" as const,
};

const DEMO_COVER_STYLE = {
  backgroundImage: "/cover-segments/_default/3.png",
  coverHeight: 300,
  overlayColor: "#020617",
  overlayOpacity: 45,
  alignment: "center" as const,
  textColor: "#ffffff",
  backgroundColor: "#0f172a",
};

const DEMO_COVER_ORG = {
  companyName: "Solar Prime",
  primaryColor: "#10b981",
};

class ScaledSectionErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const NATURAL_WIDTH = 700;
const CONTAINER_WIDTH = 292;

function ScaledSectionPreview({
  type,
  variant,
  containerWidth = CONTAINER_WIDTH,
  aspectRatio = 0.75,
  branding,
}: {
  type: SectionType;
  variant?: string;
  containerWidth?: number;
  aspectRatio?: number;
  branding?: ProposalStyles["branding"];
}) {
  const scale = containerWidth / NATURAL_WIDTH;
  const containerHeight = Math.round(containerWidth * aspectRatio);
  const section = getDemoSection(type, variant);

  const resolvedBranding = {
    primaryColor: branding?.primaryColor ?? DEMO_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor ?? DEMO_BRANDING.secondaryColor,
    textColor: branding?.textColor ?? DEMO_BRANDING.textColor,
    backgroundColor: branding?.backgroundColor ?? DEMO_BRANDING.backgroundColor,
  };

  const renderOptions: SectionRenderOptions = { mode: "web", branding: resolvedBranding };

  const coverStyle = {
    ...DEMO_COVER_STYLE,
    backgroundColor: resolvedBranding.backgroundColor,
    overlayColor: resolvedBranding.backgroundColor,
  };

  const coverOrg = {
    ...DEMO_COVER_ORG,
    primaryColor: resolvedBranding.primaryColor,
  };

  const inner =
    type === "cover" ? (
      <Cover
        variant={
          (section.variant ?? "full-image") as "full-image" | "split" | "minimal" | "card-overlay"
        }
        content={DEMO_COVER_CONTENT}
        style={coverStyle}
        organization={coverOrg}
        typography={{ titleSize: 36, subtitleSize: 24, bodySize: 16 }}
      />
    ) : (
      <SectionShell
        section={section}
        subtitleSize={16}
        vars={DEMO_VARS}
        defaults={resolvedBranding}
      >
        {renderSectionContent(section, DEMO_VARS, renderOptions)}
      </SectionShell>
    );

  return (
    <div
      className="overflow-hidden rounded-lg border border-[var(--color-border)]"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <div
        style={{
          width: NATURAL_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          userSelect: "none",
          minHeight: Math.round(containerHeight / scale),
          overflow: "hidden",
        }}
      >
        <ScaledSectionErrorBoundary
          fallback={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 200,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Preview indisponível
            </div>
          }
        >
          {inner}
        </ScaledSectionErrorBoundary>
      </div>
    </div>
  );
}

function IconGrid() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l7-3z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconX() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

const CATEGORY_ICON: Record<string, JSX.Element> = {
  Essenciais: <IconLayout />,
  Financeiro: <IconDollar />,
  Visual: <IconImage />,
  Confiança: <IconShield />,
  Avançado: <IconSettings />,
};

interface AddSectionModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: SectionType, variant: string, fieldsPatch?: Record<string, unknown>) => void;
  existingSections: ProposalSection[];
  templateName?: string;
  branding?: ProposalStyles["branding"];
}

type LibraryView = "all" | "recent" | "favorites";

export function AddSectionModal({
  open,
  onClose,
  onAdd,
  existingSections,
  templateName,
  branding,
}: AddSectionModalProps) {
  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<SectionType>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "popular" | "new">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!openRef.current) return;
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const existingTypes = useMemo(
    () => new Set(existingSections.map((s) => s.type)),
    [existingSections]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of SECTION_CATEGORY_ORDER) {
      counts[cat] = SECTION_TYPES.filter((t) => SECTION_CATEGORY_BY_TYPE[t] === cat).length;
    }
    return counts;
  }, []);

  const POPULAR_TYPES: SectionType[] = useMemo(
    () => ["cover", "pricing", "solution", "testimonials", "guarantees", "proposal_equipment"],
    []
  );
  const NEW_TYPES: SectionType[] = useMemo(() => ["comparison", "video", "economy_purchases"], []);

  const recentTypes: SectionType[] = useMemo(
    () => ["pricing", "testimonials", "guarantees", "about_company", "solution", "faq", "cover"],
    []
  );

  const filteredTypes = useMemo(() => {
    let base: SectionType[];
    if (libraryView === "recent") base = recentTypes;
    else if (libraryView === "favorites") base = SECTION_TYPES.filter((t) => favorites.has(t));
    else base = SECTION_TYPES;

    if (activeCategory) base = base.filter((t) => SECTION_CATEGORY_BY_TYPE[t] === activeCategory);
    if (activeFilter === "popular") base = base.filter((t) => POPULAR_TYPES.includes(t));
    if (activeFilter === "new") base = base.filter((t) => NEW_TYPES.includes(t));
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (t) =>
          SECTION_TYPE_LABELS[t].toLowerCase().includes(q) ||
          SECTION_CATEGORY_BY_TYPE[t].toLowerCase().includes(q) ||
          SECTION_META[t].desc.toLowerCase().includes(q)
      );
    }
    return base;
  }, [
    libraryView,
    activeCategory,
    activeFilter,
    search,
    favorites,
    POPULAR_TYPES,
    NEW_TYPES,
    recentTypes,
  ]);

  function toggleFavorite(type: SectionType, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function handleAdd() {
    if (selectedType) {
      const variant = selectedVariant ?? SECTION_VARIANTS[selectedType]?.[0] ?? "default";
      const demoOverrides = DEMO_FIELD_OVERRIDES[selectedType];
      const fieldsPatch = demoOverrides ? { ...demoOverrides } : undefined;
      onAdd(selectedType, variant, fieldsPatch);
      onClose();
    }
  }

  if (!open) return null;

  const selected = selectedType;
  const selectedMeta = selected ? SECTION_META[selected] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
        style={{ height: "min(760px, calc(100vh - 80px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div className="flex shrink-0 items-center gap-4 border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-[var(--color-foreground)]">
              Adicionar nova seção
            </h2>
            {templateName && (
              <p className="text-[12px] text-[var(--color-muted-foreground)]">
                Template: <strong className="text-[var(--color-foreground)]">{templateName}</strong>
              </p>
            )}
          </div>

          {}
          <div className="relative ml-auto max-w-[420px] flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
              <IconSearch />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome, tipo ou conteúdo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-2.5 pl-9 pr-12 text-[13px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            <IconX />
          </button>
        </div>

        {}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {}
          <aside className="w-[248px] shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-background)] p-3">
            {}
            <div className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Biblioteca
              </p>
              {(
                [
                  {
                    view: "all" as const,
                    label: "Todas as seções",
                    icon: <IconGrid />,
                    count: SECTION_TYPES.length,
                  },
                  {
                    view: "recent" as const,
                    label: "Recentes",
                    icon: <IconClock />,
                    count: recentTypes.length,
                  },
                  {
                    view: "favorites" as const,
                    label: "Favoritas",
                    icon: <IconStar />,
                    count: favorites.size,
                  },
                ] as const
              ).map(({ view, label, icon, count }) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    setLibraryView(view);
                    setActiveCategory(null);
                  }}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${
                    libraryView === view && !activeCategory
                      ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`}
                >
                  <span className="shrink-0">{icon}</span>
                  <span className="flex-1 text-left">{label}</span>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">{count}</span>
                </button>
              ))}
            </div>

            {}
            <div className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Categorias
              </p>
              {SECTION_CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setLibraryView("all");
                  }}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${
                    activeCategory === cat
                      ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`}
                >
                  <span className="shrink-0">{CATEGORY_ICON[cat]}</span>
                  <span className="flex-1 text-left">{cat}</span>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    {categoryCounts[cat]}
                  </span>
                </button>
              ))}
            </div>

            {}
            <div className="mx-2 mb-4 border-t border-[var(--color-border)]" />

            {}
            <div className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Pessoal
              </p>
              <button
                type="button"
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                <IconBookmark />
                <span className="flex-1 text-left">Minhas seções</span>
              </button>
              <button
                type="button"
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                <IconUpload />
                <span className="flex-1 text-left">Importar de outra proposta</span>
              </button>
            </div>

            {}
            <div className="mx-1 rounded-xl border border-violet-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:border-violet-800 dark:from-indigo-950/30 dark:to-purple-950/30">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-violet-700 dark:text-violet-400">
                <IconSparkle /> Gerar com IA
              </p>
              <p className="mb-2.5 text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                Descreva a seção que precisa e a IA cria a partir do contexto da proposta.
              </p>
              <button
                type="button"
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 py-2 text-[11px] font-semibold text-white hover:from-violet-700 hover:to-indigo-600"
              >
                + Nova seção com IA
              </button>
            </div>
          </aside>

          {}
          <main className="flex-1 overflow-y-auto p-5">
            {}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-[14px] font-semibold text-[var(--color-foreground)]">
                {activeCategory ??
                  (libraryView === "favorites"
                    ? "Favoritas"
                    : libraryView === "recent"
                      ? "Recentes"
                      : "Todas as seções")}
                <span className="ml-2 text-[13px] font-normal text-[var(--color-muted-foreground)]">
                  {filteredTypes.length} seções
                </span>
              </p>
              {(["all", "popular", "new"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition ${
                    activeFilter === f
                      ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-card)]"
                      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)]/30 hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {f === "all" ? "Todos" : f === "popular" ? "Mais usadas" : "Novas"}
                </button>
              ))}
            </div>

            {filteredTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[14px] font-medium text-[var(--color-muted-foreground)]">
                  Nenhuma seção encontrada
                </p>
                <p className="text-[12px] text-[var(--color-muted-foreground)]/60">
                  Tente outro termo ou categoria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(172px,1fr))] gap-3">
                {filteredTypes.map((type) => {
                  const inTemplate = existingTypes.has(type);
                  const isFav = favorites.has(type);
                  const isSelected = selectedType === type;
                  const isNew = NEW_TYPES.includes(type);
                  return (
                    <div
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedVariant(null);
                      }}
                      className={`group cursor-pointer overflow-hidden rounded-xl border transition-all ${
                        isSelected
                          ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                          : "border-[var(--color-border)] hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5"
                      } bg-[var(--color-card)]`}
                    >
                      {}
                      <div className="relative aspect-[4/3] border-b border-[var(--color-border)] bg-[var(--color-background)] p-2">
                        <SectionMockup kind={TYPE_MOCKUP[type]} />
                        {inTemplate && (
                          <span className="absolute right-2 top-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            No template
                          </span>
                        )}
                        {!inTemplate && isNew && (
                          <span className="absolute right-2 top-2 rounded bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Novo
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(type, e)}
                          className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-none bg-white/90 text-[var(--color-muted-foreground)] shadow backdrop-blur-sm transition ${
                            isFav
                              ? "opacity-100 text-amber-500"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill={isFav ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
                          </svg>
                        </button>
                      </div>
                      {}
                      <div className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold leading-tight text-[var(--color-foreground)]">
                          {SECTION_TYPE_LABELS[type]}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                          {SECTION_CATEGORY_BY_TYPE[type]}
                          {(() => {
                            const variantCount = (SECTION_VARIANTS[type] ?? []).length;
                            return variantCount > 1 ? ` · ${variantCount} variantes` : "";
                          })()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {}
          <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-[var(--color-border)]">
            {selected && selectedMeta ? (
              <>
                {}
                <div className="shrink-0 bg-[var(--color-background)] p-4">
                  <ScaledSectionPreview
                    type={selected}
                    variant={selectedVariant ?? undefined}
                    branding={branding}
                  />
                </div>

                {}
                <div className="flex-1 px-5 pb-5 pt-4">
                  <span className="mb-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    {SECTION_CATEGORY_BY_TYPE[selected]}
                  </span>
                  <h3 className="mb-1 text-[17px] font-bold text-[var(--color-foreground)]">
                    {SECTION_TYPE_LABELS[selected]}
                  </h3>
                  <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
                    {selectedMeta.desc}
                  </p>

                  {}
                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-background)] p-3">
                    {[
                      { label: "Páginas", value: "1" },
                      {
                        label: "Variáveis",
                        value: selectedMeta.vars > 0 ? `${selectedMeta.vars} dinâmicas` : "—",
                      },
                      { label: "Última atualização", value: "há 3 dias" },
                      {
                        label: "Usado em",
                        value: `${((selected.length * 17 + 23) % 180) + 20} propostas`,
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                          {label}
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold text-[var(--color-foreground)]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {}
                  {(() => {
                    const variants = SECTION_VARIANTS[selected] ?? [];
                    if (variants.length <= 1) return null;
                    const activeVariant = selectedVariant ?? variants[0];
                    return (
                      <>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                          Variantes ({variants.length})
                        </p>
                        <div
                          className={`grid gap-2 ${variants.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}
                        >
                          {variants.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setSelectedVariant(v)}
                              className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-1 transition ${
                                v === activeVariant
                                  ? "border-emerald-500"
                                  : "border-[var(--color-border)] hover:border-[var(--color-foreground)]/30"
                              }`}
                            >
                              <div className="aspect-video w-full overflow-hidden rounded">
                                <ScaledSectionPreview
                                  type={selected}
                                  variant={v}
                                  containerWidth={84}
                                  aspectRatio={9 / 16}
                                  branding={branding}
                                />
                              </div>
                              <p className="truncate text-center text-[9px] font-medium text-[var(--color-muted-foreground)]">
                                {VARIANT_LABELS[v] ?? v}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-background)]">
                  <IconGrid />
                </div>
                <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                  Selecione uma seção
                </p>
                <p className="text-[12px] leading-snug text-[var(--color-muted-foreground)]">
                  Clique em qualquer card para ver o preview e as informações detalhadas.
                </p>
              </div>
            )}
          </aside>
        </div>

        {}
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-background)] px-5 py-3.5">
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-muted-foreground)]">
            <span>Posição:</span>
            <select className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] text-[var(--color-foreground)] focus:outline-none">
              <option>Após última seção</option>
              <option>No início</option>
              <option>No final</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selected}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[13px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40"
            >
              <IconCopy /> Duplicar
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <IconPlus /> Adicionar ao template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
