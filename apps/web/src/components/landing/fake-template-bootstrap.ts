import type { TemplateBootstrapApiResult } from "@/lib/merge-template-bootstrap";

export const fakeTemplateBootstrap: TemplateBootstrapApiResult = {
  styles: {
    branding: {
      primaryColor: "#FF6F00",
      secondaryColor: "#FFD54F",
      backgroundColor: "#FFFFFF",
      textColor: "#212121",
    },
    typography: {
      fontFamily: "Roboto",
      preset: "medium",
    },
    cover: {
      overlayColor: "#000000",
      overlayOpacity: 0.4,
      titleText: "Proposta de Energia Solar para {{nome_cliente}}",
    },
    layout: {
      pageWidth: "medium",
      spacing: "normal",
      borderRadius: 12,
      shadowIntensity: 4,
    },
  },
  sections: [
    {
      type: "cover",
      variant: "full-image",
      title: "Proposta de Energia Solar para {{nome_cliente}}",
      content: "",
      fields: {
        title: "Proposta de Energia Solar para {{nome_cliente}}",
        subtitle:
          "<p>Esta proposta foi elaborada em <strong>{{data_proposta}}</strong>, e visa atender as suas necessidades energéticas com eficiência e sustentabilidade.</p>",
        highlight: "Energia Sustentável",
      },
    },
    {
      type: "introduction",
      variant: "default",
      title: "Introdução ao Projeto",
      content:
        "<p>Nesta proposta, analisamos o consumo energético de {{nome_cliente}} e apresentamos uma solução personalizada de energia solar que visa otimizar custos e promover a sustentabilidade. O estudo incluiu uma avaliação detalhada do consumo atual, bem como simulações de geração de energia.</p><p>Nos próximos tópicos, você encontrará informações detalhadas sobre a solução proposta, os equipamentos, a economia esperada e muito mais.</p>",
      fields: { title: "Introdução ao Projeto" },
    },
    {
      type: "about_company",
      variant: "default",
      title: "Sobre a EnergivIA",
      content:
        "<p>A EnergivIA é uma empresa dedicada a soluções de energia solar, com um time de especialistas em eficiência energética e sustentabilidade. Nossa missão é transformar a forma como empresas e residências consomem energia, oferecendo tecnologia de ponta e atendimento personalizado.</p><p>Com anos de experiência no mercado, temos orgulho de ajudar nossos clientes a reduzir custos e minimizar impactos ambientais por meio de soluções inovadoras e sustentáveis.</p>",
      fields: { title: "Sobre a EnergivIA" },
    },
    {
      type: "solution",
      variant: "topics",
      title: "Solução Proposta",
      content:
        "<p>O sistema proposto para {{nome_cliente}} é projetado para atender a <strong>{{cobertura_consumo_pct}}%</strong> do consumo mensal de energia, com uma capacidade instalada de <strong>{{tamanho_sistema_kw}} kW</strong>. Esse sistema será capaz de gerar aproximadamente <strong>{{geracao_mensal_kwh}} kWh/mês</strong>, proporcionando uma significativa economia na conta de energia.</p>",
      fields: {
        solutionName: "Sistema de Energia Solar Fotovoltaica",
        benefits: [
          { id: "kit-b-1", text: "Redução de Custos", icon: "dollar-sign" },
          { id: "kit-b-2", text: "Sustentabilidade Ambiental", icon: "leaf" },
          { id: "kit-b-3", text: "Autossuficiência Energética", icon: "battery" },
        ],
        howItWorks: "Sistema intuitivo e fácil de operar.",
        title: "Solução Proposta",
      },
    },
    {
      type: "diagnostic_energy",
      variant: "topics",
      title: "Cenário Atual de Energia",
      content:
        "<p>O cenário atual de consumo de energia apresenta diversas oportunidades de melhoria. A seguir, destacamos algumas das principais dores que a {{nome_empresa}} pode ajudar a resolver.</p>",
      fields: {
        painPoints: [
          { text: "Altos custos com energia", icon: "dollar-sign" },
          { text: "Dependência de fornecedores", icon: "plug" },
          { text: "Impacto ambiental significativo", icon: "badge-alert" },
        ],
        impact: [
          { text: "Redução de emissões de CO2", icon: "line-chart" },
          { text: "Sustentabilidade a longo prazo", icon: "clock" },
        ],
        highlightText: "Transição para uma energia mais limpa e econômica.",
        title: "Cenário Atual de Energia",
      },
    },
    {
      type: "pricing",
      variant: "table",
      title: "Investimento e Condições Comerciais",
      content:
        "<p>Apresentamos as condições comerciais para a instalação do sistema de energia solar fotovoltaica.</p>",
      fields: { title: "Investimento e Condições Comerciais" },
    },
    {
      type: "economy_purchases",
      variant: "default",
      title: "Economia Projetada",
      content:
        "<p>Com a implementação do sistema, estimamos uma economia na conta de energia que pode ser traduzida em investimentos em outras áreas.</p>",
      fields: { title: "Economia Projetada" },
    },
    {
      type: "testimonials",
      variant: "quote_header",
      title: "O que nossos clientes dizem",
      content: "<p>Veja o que nossos clientes têm a dizer sobre a experiência com a EnergivIA.</p>",
      fields: {
        title: "O que nossos clientes dizem",
        items: [
          {
            name: "Carlos Silva",
            subtitle: "Empreendedor",
            text: "A EnergivIA transformou a forma como gerenciamos nossa energia.",
            photo: "",
          },
          {
            name: "Maria Oliveira",
            subtitle: "Gerente de Projetos",
            text: "O suporte e a eficiência da equipe foram fundamentais na implantação.",
            photo: "",
          },
        ],
      },
    },
    {
      type: "faq",
      variant: "accordion",
      title: "Dúvidas Frequentes",
      content: "<p>Aqui estão algumas perguntas frequentes sobre energia solar.</p>",
      fields: {
        title: "Dúvidas Frequentes",
        items: [
          {
            question: "Qual é a vida útil de um sistema solar?",
            answer: "<p>Um sistema bem instalado pode durar mais de 25 anos.</p>",
          },
          {
            question: "Como funciona a instalação?",
            answer: "<p>Nossa equipe cuida de todas as etapas, do projeto à execução.</p>",
          },
        ],
      },
    },
    {
      type: "cta",
      variant: "primary",
      title: "Pronto para começar?",
      content: "<p>Entre em contato e dê o próximo passo para reduzir custos com energia.</p>",
      fields: { title: "Pronto para começar?" },
    },
    {
      type: "signature",
      variant: "default",
      title: "Agradecemos pela oportunidade",
      content: "<p>Atenciosamente,<br />Equipe EnergivIA</p>",
      fields: { title: "Agradecemos pela oportunidade" },
    },
  ],
};
