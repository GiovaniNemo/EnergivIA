export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  preferredPlacement?: TourPlacement;
  nextLabel?: string;
  skipLabel?: string;
  requiresModal?: "new-proposal" | "proposal-study" | null;
  highlightBadge?: string;
}

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard-overview",
    title: "Bem-vindo à EnergivIA",
    description:
      "Sua plataforma completa de inteligência comercial para energia solar. Aqui no Painel você acompanha métricas consolidadas da sua empresa, funil de vendas, oportunidades e atividades em tempo real.",
    targetSelector: '[data-tour="dashboard-overview"]',
    preferredPlacement: "bottom",
    nextLabel: "Avançar",
    skipLabel: "Já conheço a plataforma",
    highlightBadge: "Visão Geral",
  },
  {
    id: "proposal-shortcuts",
    title: "Como gerar sua primeira proposta",
    description:
      "Você pode gerar uma proposta em segundos de duas formas simples: arrastando uma conta de luz (PDF ou foto) para leitura automática pela IA, ou clicando no botão '+ Nova proposta' para iniciar o fluxo manual.",
    targetSelector: '[data-tour="proposal-shortcuts"]',
    preferredPlacement: "bottom",
    nextLabel: "Ver criação de proposta",
    skipLabel: "Pular tutorial",
    highlightBadge: "Atalhos Rápidos",
  },
  {
    id: "new-proposal-client",
    title: "Identificação do cliente",
    description:
      "Selecione um cliente existente ou cadastre o nome e WhatsApp do novo cliente. O estudo e os orçamentos ficarão automaticamente organizados no histórico dessa oportunidade comercial.",
    targetSelector: '[data-tour="new-proposal-dialog"]',
    preferredPlacement: "left",
    requiresModal: "new-proposal",
    nextLabel: "Avançar para o estudo solar",
    skipLabel: "Pular tutorial",
    highlightBadge: "Passo 1: Cliente",
  },
  {
    id: "proposal-study-simulation",
    title: "Estudo solar e dimensionamento IA",
    description:
      "O motor da EnergivIA calcula o consumo, dimensiona a potência do gerador (kWp) necessária e seleciona kits dos seus distribuidores integrados com regras de precificação e retorno financeiro calculados automaticamente.",
    targetSelector: '[data-tour="proposal-study-simulation"]',
    preferredPlacement: "right",
    requiresModal: "proposal-study",
    nextLabel: "Ver geração da proposta",
    skipLabel: "Pular tutorial",
    highlightBadge: "Passo 2: Dimensionamento",
  },
  {
    id: "proposal-generate-action",
    title: "Geração e envio da proposta comercial",
    description:
      "Ao finalizar os ajustes, basta clicar em Gerar Proposta. Uma página interativa personalizada, com a identidade visual da sua empresa e link para aceite direto do cliente é gerada instantaneamente.",
    targetSelector: '[data-tour="btn-generate-proposal"]',
    preferredPlacement: "top",
    requiresModal: "proposal-study",
    nextLabel: "Concluir tutorial",
    skipLabel: "Fechar",
    highlightBadge: "Passo 3: Proposta Pronta",
  },
];
